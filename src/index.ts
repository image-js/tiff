import TIFFDecoder from './tiffDecoder';
import { BufferType, IDecodeOptions } from './types';
import TiffIfd from './tiffIfd';

function decodeTIFF(data: BufferType, options?: IDecodeOptions): TiffIfd[] {
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

export { decodeTIFF as decode, isMultiPage, pageCount, IDecodeOptions };
