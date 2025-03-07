import { tagsById as exif } from './tags/exif';
import { tagsById as gps } from './tags/gps';
import { tagsById as standard } from './tags/standard';
import TIFFDecoder from './tiffDecoder';
import type TiffIfd from './tiffIfd';
import type { BufferType, DecodeOptions } from './types';

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

export { type DecodeOptions } from './types';
export { default as TiffIfd } from './tiffIfd';
