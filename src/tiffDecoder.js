import { IOBuffer } from 'iobuffer';

import IFD from './ifd';
import TiffIFD from './tiffIfd';
import { getByteLength, readData } from './ifdValue';

const defaultOptions = {
  ignoreImageData: false,
  onlyFirst: false
};

export default class TIFFDecoder extends IOBuffer {
  constructor(data, options) {
    super(data, options);
    this._nextIFD = 0;
  }

  get isMultiPage() {
    let c = 0;
    this.decodeHeader();
    while (this._nextIFD) {
      c++;
      this.decodeIFD({ ignoreImageData: true });
      if (c === 2) {
        return true;
      }
    }
    if (c === 1) {
      return false;
    }
    throw unsupported('ifdCount', c);
  }

  get pageCount() {
    let c = 0;
    this.decodeHeader();
    while (this._nextIFD) {
      c++;
      this.decodeIFD({ ignoreImageData: true });
    }
    if (c > 0) {
      return c;
    }
    throw unsupported('ifdCount', c);
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
    const value = this.readUint16();
    if (value === 0x4949) {
      this.setLittleEndian();
    } else if (value === 0x4d4d) {
      this.setBigEndian();
    } else {
      throw new Error(`invalid byte order: 0x${value.toString(16)}`);
    }

    // Magic number
    if (this.readUint16() !== 42) {
      throw new Error('not a TIFF file');
    }

    // Offset of the first IFD
    this._nextIFD = this.readUint32();
  }

  decodeIFD(options) {
    this.seek(this._nextIFD);

    var ifd;
    if (!options.kind) {
      ifd = new TiffIFD();
    } else {
      ifd = new IFD(options.kind);
    }

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
    const offset = this.offset;
    const tag = this.readUint16();
    const type = this.readUint16();
    const numValues = this.readUint32();

    if (type < 1 || type > 12) {
      this.skip(4); // unknown type, skip this value
      return;
    }

    const valueByteLength = getByteLength(type, numValues);
    if (valueByteLength > 4) {
      this.seek(this.readUint32());
    }

    const value = readData(this, type, numValues);
    ifd.fields.set(tag, value);

    // Read sub-IFDs
    if (tag === 0x8769 || tag === 0x8825) {
      let currentOffset = this.offset;
      let kind;
      if (tag === 0x8769) {
        kind = 'exif';
      } else if (tag === 0x8825) {
        kind = 'gps';
      }
      this._nextIFD = value;
      ifd[kind] = this.decodeIFD({
        kind,
        ignoreImageData: true
      });
      this.offset = currentOffset;
    }

    // go to the next entry
    this.seek(offset);
    this.skip(12);
  }

  decodeImageData(ifd) {
    const orientation = ifd.orientation;
    if (orientation && orientation !== 1) {
      throw unsupported('orientation', orientation);
    }
    switch (ifd.type) {
      case 0: // WhiteIsZero
      case 1: // BlackIsZero
      case 2: // RGB
        this.readStripData(ifd);
        break;
      default:
        throw unsupported('image type', ifd.type);
    }
    if (ifd.type === 0) {
      // WhiteIsZero: we invert the values
      const bitDepth = validateBitDepth(ifd.bitsPerSample);
      const maxValue = Math.pow(2, bitDepth) - 1;
      for (var i = 0; i < ifd.data.length; i++) {
        ifd.data[i] = maxValue - ifd.data[i];
      }
    }
  }

  readStripData(ifd) {
    const width = ifd.width;
    const height = ifd.height;

    const bitDepth = validateBitDepth(ifd.bitsPerSample);
    const sampleFormat = ifd.sampleFormat;
    const size = width * height;
    const data = getDataArray(size, 1, bitDepth, sampleFormat);

    const compression = ifd.compression;
    const rowsPerStrip = ifd.rowsPerStrip;
    const maxPixels = rowsPerStrip * width;
    const stripOffsets = ifd.stripOffsets;
    const stripByteCounts = ifd.stripByteCounts;

    var remainingPixels = size;
    var pixel = 0;
    for (var i = 0; i < stripOffsets.length; i++) {
      var stripData = new DataView(
        this.buffer,
        stripOffsets[i],
        stripByteCounts[i]
      );

      // Last strip can be smaller
      var length = remainingPixels > maxPixels ? maxPixels : remainingPixels;
      remainingPixels -= length;

      switch (compression) {
        case 1: // No compression
          pixel = this.fillUncompressed(
            bitDepth,
            sampleFormat,
            data,
            stripData,
            pixel,
            length
          );
          break;
        case 5: // LZW
          throw unsupported('lzw');
        case 2: // CCITT Group 3 1-Dimensional Modified Huffman run length encoding
        case 32773: // PackBits compression
          throw unsupported('Compression', compression);
        default:
          throw new Error(`invalid compression: ${compression}`);
      }
    }

    ifd.data = data;
  }

  fillUncompressed(bitDepth, sampleFormat, data, stripData, pixel, length) {
    if (bitDepth === 8) {
      return fill8bit(data, stripData, pixel, length);
    } else if (bitDepth === 16) {
      return fill16bit(data, stripData, pixel, length, this.isLittleEndian());
    } else if (bitDepth === 32 && sampleFormat === 3) {
      return fillFloat32(data, stripData, pixel, length, this.isLittleEndian());
    } else {
      throw unsupported('bitDepth', bitDepth);
    }
  }
}

function getDataArray(size, channels, bitDepth, sampleFormat) {
  if (bitDepth === 8) {
    return new Uint8Array(size * channels);
  } else if (bitDepth === 16) {
    return new Uint16Array(size * channels);
  } else if (bitDepth === 32 && sampleFormat === 3) {
    return new Float32Array(size * channels);
  } else {
    throw unsupported(
      'bit depth / sample format',
      `${bitDepth} / ${sampleFormat}`
    );
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
  return new Error(`Unsupported ${type}: ${value}`);
}

function validateBitDepth(bitDepth) {
  if (bitDepth.length) {
    const bitDepthArray = bitDepth;
    bitDepth = bitDepthArray[0];
    for (var i = 0; i < bitDepthArray.length; i++) {
      if (bitDepthArray[i] !== bitDepth) {
        throw unsupported('bit depth', bitDepthArray);
      }
    }
  }
  return bitDepth;
}
