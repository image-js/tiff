import { IOBuffer } from 'iobuffer';

export type BufferType = ArrayBufferLike | ArrayBufferView | IOBuffer | Buffer;

export interface DecodeOptions {
  ignoreImageData?: boolean;
  /**
   * Specify the indices of the pages to decode in case of a multi-page TIFF.
   */
  pages?: number[];
}

export type IFDKind = 'standard' | 'exif' | 'gps';

export type DataArray = Uint8Array | Uint16Array | Float32Array;
