import { IOBuffer } from 'iobuffer';

import { convertWhiteIsZero, convertYCbCr } from './colorConversion';
import {
  applyHorizontalDifferencing8Bit,
  applyHorizontalDifferencing16Bit,
} from './horizontalDifferencing';
import IFD from './ifd';
import { getByteLength, readData } from './ifdValue';
import { readStripData } from './readStripData';
import { readTileData } from './readTileData';
import TiffIfd from './tiffIfd';
import { BufferType, IDecodeOptions, IFDKind } from './types';
import { unsupported } from './utils';

const defaultOptions: IDecodeOptions = {
  ignoreImageData: false,
  onlyFirst: false,
};

interface IInternalOptions extends IDecodeOptions {
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

  public decode(options: IDecodeOptions = {}): TiffIfd[] {
    options = Object.assign({}, defaultOptions, options);
    const result = [];
    this.decodeHeader();
    while (this._nextIFD) {
      result.push(this.decodeIFD(options, true));
      if (options.onlyFirst) {
        return [result[0]];
      }
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

  private decodeIFD(options: IInternalOptions, tiff: true): TiffIfd;
  private decodeIFD(options: IInternalOptions, tiff: false): IFD;
  private decodeIFD(options: IInternalOptions, tiff: boolean): TiffIfd | IFD {
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
    checkIfdType(ifd.type);

    if (ifd.hasStrips) {
      readStripData(this, ifd);
    } else if (ifd.hasTiles) {
      readTileData(this, ifd);
    } else {
      throw new Error('cannot read TIFF without strip or tile data');
    }

    this.applyPredictor(ifd);
    this.convertAlpha(ifd);
    if (ifd.type === 0) {
      convertWhiteIsZero(ifd);
    } else if (ifd.type === 6) {
      convertYCbCr(ifd);
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

function checkIfdType(type: number): void {
  if (
    // WhiteIsZero
    type !== 0 &&
    // BlackIsZero
    type !== 1 &&
    // RGB
    type !== 2 &&
    // Palette color
    type !== 3 &&
    // YCbCr (Class Y)
    type !== 6
  ) {
    throw unsupported('image type', type);
  }
}
