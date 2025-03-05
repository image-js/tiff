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

    options = { ...defaultOptions, ...options };
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
      const currentOffset = this.offset;
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
        if (ifd.tiled) {
          this.readTileData(ifd);
        } else {
          this.readStripData(ifd);
        }
        break;
      default:
        throw unsupported('image type', ifd.type);
    }
    this.applyPredictor(ifd);
    this.convertAlpha(ifd);
    if (ifd.type === 0) {
      // WhiteIsZero: we invert the values
      const bitDepth = ifd.bitsPerSample;
      const maxValue = 2 ** bitDepth - 1;
      for (let i = 0; i < ifd.data.length; i++) {
        ifd.data[i] = maxValue - ifd.data[i];
      }
    }
  }

  private static uncompress(data: DataView, compression = 1): DataView {
    switch (compression) {
      // No compression, nothing to do
      case 1: {
        return data;
      }
      // LZW compression
      case 5: {
        return decompressLzw(data);
      }
      // Zlib and Deflate compressions. They are identical.
      case 8:
      case 32946: {
        return decompressZlib(data);
      }
      case 2: // CCITT Group 3 1-Dimensional Modified Huffman run length encoding
        throw unsupported('Compression', 'CCITT Group 3');
      case 32773: // PackBits compression
        throw unsupported('Compression', 'PackBits');
      default:
        throw unsupported('Compression', compression);
    }
  }

  private readStripData(ifd: TiffIfd): void {
    // General Image Dimensions
    const width = ifd.width;
    const height = ifd.height;
    const size = width * height * ifd.samplesPerPixel;

    // Compressed Strip Layout
    // Note: Strips are Row-Major
    const stripOffsets = ifd.stripOffsets;
    const stripByteCounts = ifd.stripByteCounts || guessStripByteCounts(ifd);
    const littleEndian = this.isLittleEndian();
    const stripLength = width * ifd.rowsPerStrip * ifd.samplesPerPixel;

    // Output Data Buffer
    const output = getDataArray(size, ifd.bitsPerSample, ifd.sampleFormat);

    // Iterate over Number of Strips
    let start = 0;
    for (let i = 0; i < stripOffsets.length; i++) {
      // Extract Strip Data, Uncompress
      const stripData = new DataView(
        this.buffer,
        this.byteOffset + stripOffsets[i],
        stripByteCounts[i],
      );
      const uncompressed = TIFFDecoder.uncompress(stripData, ifd.compression);

      // Last strip can be smaller
      const length = Math.min(stripLength, size - start);

      // Write Uncompressed Strip Data to Output (Linear Layout)
      for (let index = 0; index < length; ++index) {
        const value = this.sampleValue(
          uncompressed,
          index,
          ifd.sampleFormat,
          ifd.bitsPerSample,
          littleEndian,
        );
        output[start + index] = value;
      }

      start += length;
    }

    ifd.data = output;
  }

  private readTileData(ifd: TiffIfd): void {
    if (!ifd.tileWidth || !ifd.tileHeight) {
      return;
    }

    // General Image Dimensions
    const width = ifd.width;
    const height = ifd.height;
    const size = width * height * ifd.samplesPerPixel;

    // Tile Dimensions, Counts
    const twidth = ifd.tileWidth;
    const theight = ifd.tileHeight;
    const nwidth = Math.floor((width + twidth - 1) / twidth);
    const nheight = Math.floor((height + theight - 1) / theight);

    // Compressed Tile Layout
    const tileOffsets = ifd.tileOffsets;
    const tileByteCounts = ifd.tileByteCounts;
    const littleEndian = this.isLittleEndian();

    // Output Data Buffer
    const output = getDataArray(size, ifd.bitsPerSample, ifd.sampleFormat);

    // Iterate over Set of Tiles
    for (let nx = 0; nx < nwidth; ++nx) {
      for (let ny = 0; ny < nheight; ++ny) {
        // Note: TIFF Orders Tiles Row-Major,
        //  including the tile interiors.
        const nind = ny * nwidth + nx;

        // Extract and Decompress Tile Data
        const tileData = new DataView(
          this.buffer,
          tileOffsets[nind],
          tileByteCounts[nind],
        );
        const uncompressed = TIFFDecoder.uncompress(tileData, ifd.compression);

        // Write Uncompressed Tile Data to Output
        for (let tx = 0; tx < twidth; ++tx) {
          for (let ty = 0; ty < theight; ++ty) {
            const ix = nx * twidth + tx;
            const iy = ny * theight + ty;
            if (ix >= width) continue;
            if (iy >= height) continue;

            const index = ty * twidth + tx;
            const value = this.sampleValue(
              uncompressed,
              index,
              ifd.sampleFormat,
              ifd.bitsPerSample,
              littleEndian,
            );

            const indexOut = iy * width + ix;
            output[indexOut] = value;
          }
        }
      }
    }

    ifd.data = output;
  }

  //! sampleValue retrieves a single, typed value
  //! from a DataView while considering the format,
  //! bitDepth and endianness.
  //!
  //! As this is called once per iteration, it would make
  //! sense to convert this to a switch or if statement
  //! over an enumerator instead of a parameter.
  //!
  private sampleValue(
    data: DataView,
    index: number,
    sampleFormat: number,
    bitDepth: number,
    littleEndian: boolean,
  ): number {
    if (bitDepth === 8) {
      return data.getUint8(index);
    } else if (bitDepth === 16) {
      return data.getUint16(2 * index, littleEndian);
    } else if (bitDepth === 32 && sampleFormat === 3) {
      return data.getFloat32(4 * index, littleEndian);
    } else if (bitDepth === 64 && sampleFormat === 3) {
      return data.getFloat64(8 * index, littleEndian);
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
  } else if (bitDepth === 64 && sampleFormat === 3) {
    return new Float64Array(size);
  } else {
    throw unsupported(
      'bit depth / sample format',
      `${bitDepth} / ${sampleFormat}`,
    );
  }
}

function unsupported(type: string, value: any): Error {
  return new Error(`Unsupported ${type}: ${value}`);
}
function checkPages(pages: number[] | undefined) {
  if (pages) {
    for (const page of pages) {
      if (page < 0 || !Number.isInteger(page)) {
        throw new RangeError(
          `Index ${page} is invalid. Must be a positive integer.`,
        );
      }
    }
  }
}
