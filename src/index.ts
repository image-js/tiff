import type { InputData } from 'iobuffer';

import { tagsById as exif } from './tags/exif.ts';
import { tagsById as gps } from './tags/gps.ts';
import { tagsById as standard } from './tags/standard.ts';
import TIFFDecoder from './tiff_decoder.ts';
import type TiffIfd from './tiff_ifd.ts';
import type { DecodeOptions } from './types.ts';

function decodeTIFF(data: InputData, options?: DecodeOptions): TiffIfd[] {
  const decoder = new TIFFDecoder(data);
  return decoder.decode(options);
}

function isMultiPage(data: InputData): boolean {
  const decoder = new TIFFDecoder(data);
  return decoder.isMultiPage;
}

function pageCount(data: InputData): number {
  const decoder = new TIFFDecoder(data);
  return decoder.pageCount;
}

const tagNames = {
  exif,
  gps,
  standard,
};

export { decodeTIFF as decode, isMultiPage, pageCount, tagNames };

export { type DecodeOptions } from './types.ts';
export { default as TiffIfd } from './tiff_ifd.ts';
