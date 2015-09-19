'use strict';

const BinaryReader = require('./BinaryReader');
const IFD = require('./IFD');
const IFDValue = require('./IFDValue');
const TIFF = require('./TIFF');

class TIFFDecoder extends BinaryReader {
    constructor(data) {
        super(data);
        this.decoded = false;
        this.tiff = null;
        this.nextIFD = 0;
    }

    decode() {
        if (this.decoded) return this.tiff;
        this.tiff = new TIFF();
        this.decodeHeader();
        while (this.nextIFD) {
            this.decodeIFD();
        }
        return this.tiff;
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
        this.nextIFD = this.readUint32();
    }

    decodeIFD() {
        this.goto(this.nextIFD);
        var ifd = new IFD();
        this.tiff.ifd.push(ifd);
        const numEntries = this.readUint16();
        for (var i = 0; i < numEntries; i++) {
            this.decodeIFDEntry(ifd);
        }
        this.decodeImageData(ifd);
        this.nextIFD = this.readUint32();
    }

    decodeIFDEntry(ifd) {
        let offset = this.offset;
        let tag = this.readUint16();
        let type = this.readUint16();
        let numValues = this.readUint32();

        // todo support other types
        if (type !== 1 && type !== 2 && type !== 3 && type !== 4) {
            this.forward(4);
            return;
        }

        let valueByteLength = IFDValue.getByteLength(type, numValues);
        if (valueByteLength > 4) {
            this.goto(this.readUint32());
        }

        var value = IFDValue.readData(this, type, numValues);
        ifd.fields.set(tag, value);

        // goto offset of next entry
        this.goto(offset + 12);
    }

    decodeImageData(ifd) {
        const orientation = ifd.orientation;
        if (orientation && orientation !== 1) {
            unsupported('orientation', orientation);
        }
        switch(ifd.type) {
            case 0: // WhiteIsZero
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
        let size = width * height;
        const data = getDataArray(size, 1, bitDepth);

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
                pixel = fill16bit(data, stripData, pixel, length, this.littleEndian);
            } else {
                unsupported('bitDepth: ', bitDepth);
            }
        }

        ifd.data = data;
    }

    getStripData(compression, offset, byteCounts) {
        switch (compression) {
            case 1: // No compression
                return new DataView(this.data.buffer, offset, byteCounts);
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

function getDataArray(size, channels, bitDepth) {
    if (bitDepth === 8) {
        return new Uint8Array(size * channels);
    } else if (bitDepth === 16) {
        return new Uint16Array(size * channels);
    } else {
        unsupported('bit depth', bitDepth);
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

function unsupported(type, value) {
    throw new Error('Unsupported ' + type + ': ' + value);
}
