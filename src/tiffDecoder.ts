import { IOBuffer } from 'iobuffer';

import { guessStripByteCounts } from './hacks';
import {
  applyHorizontalDifferencing8Bit,
  applyHorizontalDifferencing16Bit,
} from './horizontalDifferencing';
import IFD from './ifd';
import { getByteLength, readData } from './ifdValue';
import { decompressLzw } from './lzw';
import TiffIfd from './tiffIfd';
import { BufferType, DecodeOptions, IFDKind, DataArray } from './types';
import { decompressZlib } from './zlib';

const defaultOptions: DecodeOptions = {
  ignoreImageData: false,
};

interface InternalOptions extends DecodeOptions {
  kind?: IFDKind;
}

export default class TIFFDecoder extends IOBuffer {
  private _nextIFD: number;

  public constructor(data: BufferType) {
    super(data);
    this._nextIFD = 0;
  }

  public get isMultiPage(): boolean {
    let c = 0;
    this.decodeHeader();
    while (this._nextIFD) {
      c++;
      this.decodeIFD({ ignoreImageData: true }, true);
      if (c === 2) {
        return true;
      }
    }
    if (c === 1) {
      return false;
    }
    throw unsupported('ifdCount', c);
  }

  public get pageCount(): number {
    let c = 0;
    this.decodeHeader();
    while (this._nextIFD) {
      c++;
      this.decodeIFD({ ignoreImageData: true }, true);
    }
    if (c > 0) {
      return c;
    }
    throw unsupported('ifdCount', c);
  }

  public decode(options: DecodeOptions = {}): TiffIfd[] {
    const { pages } = options;
    checkPages(pages);

    const maxIndex = pages ? Math.max(...pages) : Infinity;

    options = Object.assign({}, defaultOptions, options);
    const result = [];
    this.decodeHeader();
    let index = 0;
    while (this._nextIFD) {
      if (pages) {
        if (pages.includes(index)) {
          result.push(this.decodeIFD(options, true));
        } else {
          this.decodeIFD({ ignoreImageData: true }, true);
        }
        if (index === maxIndex) {
          break;
        }
      } else {
        result.push(this.decodeIFD(options, true));
      }
      index++;
    }
    if (index < maxIndex && maxIndex !== Infinity) {
      throw new RangeError(
        `Index ${maxIndex} is out of bounds. The stack only contains ${index} images.`,
      );
    }
    return result;
  }

  private decodeHeader(): void {
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

  private decodeIFD(options: InternalOptions, tiff: true): TiffIfd;
  private decodeIFD(options: InternalOptions, tiff: false): IFD;
  private decodeIFD(options: InternalOptions, tiff: boolean): TiffIfd | IFD {
    this.seek(this._nextIFD);

    let ifd: TiffIfd | IFD;
    if (tiff) {
      ifd = new TiffIfd();
    } else {
      if (!options.kind) {
        throw new Error(`kind is missing`);
      }
      ifd = new IFD(options.kind);
    }

    const numEntries = this.readUint16();
    for (let i = 0; i < numEntries; i++) {
      this.decodeIFDEntry(ifd);
    }
    if (!options.ignoreImageData) {
      if (!(ifd instanceof TiffIfd)) {
        throw new Error('must be a tiff ifd');
      }
      this.decodeImageData(ifd);
    }
    this._nextIFD = this.readUint32();
    return ifd;
  }

  private decodeIFDEntry(ifd: IFD): void {
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
      let kind: IFDKind = 'exif';
      if (tag === 0x8769) {
        kind = 'exif';
      } else if (tag === 0x8825) {
        kind = 'gps';
      }
      this._nextIFD = value;
      ifd[kind] = this.decodeIFD(
        {
          kind,
          ignoreImageData: true,
        },
        false,
      );
      this.offset = currentOffset;
    }

    // go to the next entry
    this.seek(offset);
    this.skip(12);
  }

  private decodeImageData(ifd: TiffIfd): void {
    const orientation = ifd.orientation;
    if (orientation && orientation !== 1) {
      throw unsupported('orientation', orientation);
    }
    switch (ifd.type) {
      case 0: // WhiteIsZero
      case 1: // BlackIsZero
      case 2: // RGB
      case 3: // Palette color
        this.readStripData(ifd);
        break;
      default:
        throw unsupported('image type', ifd.type);
    }
    this.applyPredictor(ifd);
    this.convertAlpha(ifd);
    if (ifd.type === 0) {
      // WhiteIsZero: we invert the values
      const bitDepth = ifd.bitsPerSample;
      const maxValue = Math.pow(2, bitDepth) - 1;
      for (let i = 0; i < ifd.data.length; i++) {
        ifd.data[i] = maxValue - ifd.data[i];
      }
    }
  }

  private readStripData(ifd: TiffIfd): void {
    const width = ifd.width;
    const height = ifd.height;

    const bitDepth = ifd.bitsPerSample;
    const sampleFormat = ifd.sampleFormat;
    const size = width * height * ifd.samplesPerPixel;
    const data = getDataArray(size, bitDepth, sampleFormat);

    const rowsPerStrip = ifd.rowsPerStrip;
    const maxPixels = rowsPerStrip * width * ifd.samplesPerPixel;
    const stripOffsets = ifd.stripOffsets;
    const stripByteCounts = ifd.stripByteCounts || guessStripByteCounts(ifd);

    let remainingPixels = size;
    let pixel = 0;
    for (let i = 0; i < stripOffsets.length; i++) {
      let stripData = new DataView(
        this.buffer,
        this.byteOffset + stripOffsets[i],
        stripByteCounts[i],
      );

      // Last strip can be smaller
      let length = remainingPixels > maxPixels ? maxPixels : remainingPixels;
      remainingPixels -= length;

      let dataToFill = stripData;

      switch (ifd.compression) {
        case 1: {
          // No compression, nothing to do
          break;
        }
        case 5: {
          // LZW compression
          dataToFill = decompressLzw(stripData);
          break;
        }
        case 8: {
          // Zlib compression
          dataToFill = decompressZlib(stripData);
          break;
        }
        case 2: // CCITT Group 3 1-Dimensional Modified Huffman run length encoding
          throw unsupported('Compression', 'CCITT Group 3');
        case 32773: // PackBits compression
          throw unsupported('Compression', 'PackBits');
        default:
          throw unsupported('Compression', ifd.compression);
      }

      pixel = this.fillUncompressed(
        bitDepth,
        sampleFormat,
        data,
        dataToFill,
        pixel,
        length,
      );
    }

    ifd.data = data;
  }

  private fillUncompressed(
    bitDepth: number,
    sampleFormat: number,
    data: DataArray,
    stripData: DataView,
    pixel: number,
    length: number,
  ): number {
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

  private applyPredictor(ifd: TiffIfd): void {
    const bitDepth = ifd.bitsPerSample;
    switch (ifd.predictor) {
      case 1: {
        // No prediction scheme, nothing to do
        break;
      }
      case 2: {
        if (bitDepth === 8) {
          applyHorizontalDifferencing8Bit(
            ifd.data as Uint8Array,
            ifd.width,
            ifd.components,
          );
        } else if (bitDepth === 16) {
          applyHorizontalDifferencing16Bit(
            ifd.data as Uint16Array,
            ifd.width,
            ifd.components,
          );
        } else {
          throw new Error(
            `Horizontal differencing is only supported for images with a bit depth of ${bitDepth}`,
          );
        }
        break;
      }
      default:
        throw new Error(`invalid predictor: ${ifd.predictor}`);
    }
  }

  private convertAlpha(ifd: TiffIfd): void {
    if (ifd.alpha && ifd.associatedAlpha) {
      const { data, components, maxSampleValue } = ifd;
      for (let i = 0; i < data.length; i += components) {
        const alphaValue = data[i + components - 1];
        for (let j = 0; j < components - 1; j++) {
          data[i + j] = Math.round((data[i + j] * maxSampleValue) / alphaValue);
        }
      }
    }
  }
}

function getDataArray(
  size: number,
  bitDepth: number,
  sampleFormat: number,
): DataArray {
  if (bitDepth === 8) {
    return new Uint8Array(size);
  } else if (bitDepth === 16) {
    return new Uint16Array(size);
  } else if (bitDepth === 32 && sampleFormat === 3) {
    return new Float32Array(size);
  } else {
    throw unsupported(
      'bit depth / sample format',
      `${bitDepth} / ${sampleFormat}`,
    );
  }
}

function fill8bit(
  dataTo: DataArray,
  dataFrom: DataView,
  index: number,
  length: number,
): number {
  for (let i = 0; i < length; i++) {
    dataTo[index++] = dataFrom.getUint8(i);
  }
  return index;
}

function fill16bit(
  dataTo: DataArray,
  dataFrom: DataView,
  index: number,
  length: number,
  littleEndian: boolean,
): number {
  for (let i = 0; i < length * 2; i += 2) {
    dataTo[index++] = dataFrom.getUint16(i, littleEndian);
  }
  return index;
}

function fillFloat32(
  dataTo: DataArray,
  dataFrom: DataView,
  index: number,
  length: number,
  littleEndian: boolean,
): number {
  for (let i = 0; i < length * 4; i += 4) {
    dataTo[index++] = dataFrom.getFloat32(i, littleEndian);
  }
  return index;
}

function unsupported(type: string, value: any): Error {
  return new Error(`Unsupported ${type}: ${value}`);
}
function checkPages(pages: number[] | undefined) {
  if (pages) {
    for (let page of pages) {
      if (page < 0 || Number.isInteger(page) === false) {
        throw new RangeError(
          `Index ${page} is invalid. Must be a positive integer.`,
        );
      }
    }
  }
}
