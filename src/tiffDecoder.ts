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
        if(ifd.tiled){
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

  private static uncompress(data: DataView, compression: number = 1): DataView {

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

    const width = ifd.width;
    const height = ifd.height;
    const size = width * height * ifd.samplesPerPixel;

    // Note: Strips are Column-Major
    const stripOffsets = ifd.stripOffsets;
    const stripByteCounts = ifd.stripByteCounts || guessStripByteCounts(ifd);
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
      const uncompressed = TIFFDecoder.uncompress(stripData, ifd.compression)

      // Last strip can be smaller
      const length = Math.min(stripLength, size - start);

      // Write Uncompressed Strip Data to Output
      this.fillLinear(
        ifd.bitsPerSample,
        ifd.sampleFormat,
        output,
        uncompressed,
        start,
        length
      );

      start += length;

    }

    ifd.data = output;
  }

  private fillLinear (
    bitDepth: number,
    sampleFormat: number,
    output: DataArray,
    input: DataView,
    start: number,
    length: number,
  ){
    const littleEndian = this.isLittleEndian();
    if (bitDepth === 8) {
      for (let i = 0; i < length; ++i) {
        output[start + i] = input.getUint8(i);
      }
    } else if (bitDepth === 16) {
      for (let i = 0; i < length; ++i) {
        output[start + i] = input.getUint16(2*i, littleEndian);
      }
    } else if (bitDepth === 32 && sampleFormat === 3) {
      for (let i = 0; i < length; ++i) {
        output[start + i] = input.getFloat32(4*i, littleEndian);
      }
    } else {
      throw unsupported('bitDepth', bitDepth);
    }
  }

  private readTileData(ifd: TiffIfd): void {

    if(!ifd.tileWidth || !ifd.tileHeight)
      return;

    const width = ifd.width;
    const height = ifd.height;
    const size = width * height * ifd.samplesPerPixel;

    // Tile Dimensions
    const twidth = ifd.tileWidth;
    const theight = ifd.tileHeight;
    const tileByteCounts = ifd.tileByteCounts;
    const tileOffsets = ifd.tileOffsets;

    // Tile Counts
    const nwidth = Math.floor((width + twidth - 1) / twidth);
    const nheight = Math.floor((height + theight - 1) / theight);

    // Result Data
    
    const data = getDataArray(size, ifd.bitsPerSample, ifd.sampleFormat);
    const endian = this.isLittleEndian();

    for(let nx = 0; nx < nwidth; ++nx){
      for(let ny = 0; ny < nheight; ++ny){

        const nind = nx * nheight + ny;
      
        // Tile Decompress Data
        const tileData = new DataView(
          this.buffer,
          tileOffsets[nind],
          tileByteCounts[nind],
        );
        const uncompressed = TIFFDecoder.uncompress(tileData, ifd.compression)

        // Copy Data into Tile
        for(let ix = 0; ix < twidth; ++ix){
          for(let iy = 0; iy < theight; ++iy){

            const tposx = ix;
            const tposy = iy;
            const fposx = nx * twidth + tposx;
            const fposy = ny * theight + tposy;
            if(fposx >= width) continue;
            if(fposy >= height) continue;

            const ind_out = ((width - 1 - fposx) * height + fposy);
            const ind_in = (tposx * theight + tposy);
            data[ind_out] = uncompressed.getFloat32(4*ind_in, endian);

          }
        }
      }
    }

    ifd.data = data;
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
