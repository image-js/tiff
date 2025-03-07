import { tagsById as exif } from './tags/exif.ts';
import { tagsById as gps } from './tags/gps.ts';
import { tagsById as standard } from './tags/standard.ts';
import TIFFDecoder from './tiffDecoder.ts';
import type TiffIfd from './tiffIfd.ts';
import type { BufferType, DecodeOptions } from './types.ts';

export function decode(data: BufferType, options?: DecodeOptions): TiffIfd[] {
  const decoder = new TIFFDecoder(data);
  return decoder.decode(options);
}

export function isMultiPage(data: BufferType): boolean {
  const decoder = new TIFFDecoder(data);
  return decoder.isMultiPage;
}

export function pageCount(data: BufferType): number {
  const decoder = new TIFFDecoder(data);
  return decoder.pageCount;
}

export const tagNames = {
  exif,
  gps,
  standard,
};

export { type DecodeOptions } from './types.ts';
export { default as TiffIfd } from './tiffIfd.ts';
