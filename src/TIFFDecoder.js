'use strict';

const IOBuffer = require('iobuffer');
const IFD = require('./IFD');
const IFDValue = require('./IFDValue');

const defaultOptions = {
    ignoreImageData: false,
    onlyFirst: false
};

class TIFFDecoder extends IOBuffer {
    constructor(data) {
        super(data);
        this._nextIFD = 0;
    }

    decode(options) {
        options = Object.assign({}, defaultOptions, options);
        const result = [];
        this.decodeHeader();
        while (this._nextIFD) {
            result.push(this.decodeIFD(options));
            if (options.onlyFirst) {
                return result[0];
            }
        }
        return result;
    }

    decodeHeader() {
        // Byte offset
        let value = this.readUint16();
        if (value === 0x4949) {
            this.setLittleEndian();
        } else if (value === 0x4D4D) {
            this.setBigEndian();
        } else {
            throw new Error('invalid byte order: 0x' + value.toString(16));
        }

        // Magic number
        value = this.readUint16();
        if (value !== 42) {
            throw new Error('not a TIFF file');
        }

        // Offset of the first IFD
        this._nextIFD = this.readUint32();
    }

    decodeIFD(options) {
        this.seek(this._nextIFD);
        var ifd = new IFD();
        const numEntries = this.readUint16();
        for (var i = 0; i < numEntries; i++) {
            this.decodeIFDEntry(ifd);
        }
        if (!options.ignoreImageData) {
            this.decodeImageData(ifd);
        }
        this._nextIFD = this.readUint32();
        return ifd;
    }

    decodeIFDEntry(ifd) {
        this.mark();
        let tag = this.readUint16();
        let type = this.readUint16();
        let numValues = this.readUint32();

        if (type < 1 || type > 12) {
            this.skip(4); // unknown type, skip this value
            return;
        }

        let valueByteLength = IFDValue.getByteLength(type, numValues);
        if (valueByteLength > 4) {
            this.seek(this.readUint32());
        }

        var value = IFDValue.readData(this, type, numValues);
        ifd.fields.set(tag, value);

        // go to the next entry
        this.reset();
        this.skip(12);
    }

    decodeImageData(ifd) {
        const orientation = ifd.orientation;
        if (orientation && orientation !== 1) {
            unsupported('orientation', orientation);
        }
        switch(ifd.type) {
            case 1: // BlackIsZero
                this.decodeBilevelOrGrey(ifd);
                break;
            default:
                unsupported('image type', ifd.type);
                break;
        }
    }

    decodeBilevelOrGrey(ifd) {
        const width = ifd.width;
        const height = ifd.height;

        const bitDepth = ifd.bitsPerSample;
        const sampleFormat = ifd.sampleFormat;
        let size = width * height;
        const data = getDataArray(size, 1, bitDepth, sampleFormat);

        const compression = ifd.compression;
        const rowsPerStrip = ifd.rowsPerStrip;
        const maxPixels = rowsPerStrip * width;
        const stripOffsets = ifd.stripOffsets;
        const stripByteCounts = ifd.stripByteCounts;

        var pixel = 0;
        for (var i = 0; i < stripOffsets.length; i++) {
            var stripData = this.getStripData(compression, stripOffsets[i], stripByteCounts[i]);
            // Last strip can be smaller
            var length = size > maxPixels ? maxPixels : size;
            size -= length;
            if (bitDepth === 8) {
                pixel = fill8bit(data, stripData, pixel, length);
            } else if (bitDepth === 16) {
                pixel = fill16bit(data, stripData, pixel, length, this.isLittleEndian());
            } else if (bitDepth === 32 && sampleFormat === 3) {
                pixel = fillFloat32(data, stripData, pixel, length, this.isLittleEndian());
            } else {
                unsupported('bitDepth', bitDepth);
            }
        }

        ifd.data = data;
    }

    getStripData(compression, offset, byteCounts) {
        switch (compression) {
            case 1: // No compression
                return new DataView(this.buffer, offset, byteCounts);
                break;
            case 2: // CCITT Group 3 1-Dimensional Modified Huffman run length encoding
            case 32773: // PackBits compression
                unsupported('Compression', compression);
                break;
            default:
                throw new Error('invalid compression: ' + compression);
        }
    }
}

module.exports = TIFFDecoder;

function getDataArray(size, channels, bitDepth, sampleFormat) {
    if (bitDepth === 8) {
        return new Uint8Array(size * channels);
    } else if (bitDepth === 16) {
        return new Uint16Array(size * channels);
    } else if (bitDepth === 32 && sampleFormat === 3) {
        return new Float32Array(size * channels);
    } else {
        unsupported('bit depth / sample format', bitDepth + ' / ' + sampleFormat);
    }
}

function fill8bit(dataTo, dataFrom, index, length) {
    for (var i = 0; i < length; i++) {
        dataTo[index++] = dataFrom.getUint8(i);
    }
    return index;
}

function fill16bit(dataTo, dataFrom, index, length, littleEndian) {
    for (var i = 0; i < length * 2; i += 2) {
        dataTo[index++] = dataFrom.getUint16(i, littleEndian);
    }
    return index;
}

function fillFloat32(dataTo, dataFrom, index, length, littleEndian) {
    for (var i = 0; i < length * 4; i += 4) {
        dataTo[index++] = dataFrom.getFloat32(i, littleEndian);
    }
    return index;
}

function unsupported(type, value) {
    throw new Error('Unsupported ' + type + ': ' + value);
}
