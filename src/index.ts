import TIFFDecoder from './tiffDecoder';
import TiffIfd from './tiffIfd';
import { BufferType, DecodeOptions } from './types';

function decodeTIFF(data: BufferType, options?: DecodeOptions): TiffIfd[] {
  const decoder = new TIFFDecoder(data);
  return decoder.decode(options);
}

function isMultiPage(data: BufferType): boolean {
  const decoder = new TIFFDecoder(data);
  return decoder.isMultiPage;
}

function pageCount(data: BufferType): number {
  const decoder = new TIFFDecoder(data);
  return decoder.pageCount;
}

export { decodeTIFF as decode, isMultiPage, pageCount, DecodeOptions, TiffIfd };
