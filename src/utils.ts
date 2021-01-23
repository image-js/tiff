import { decompressLzw } from './lzw';
import { decompressPhotoshopJpeg } from './photoshopJpeg';
import TiffIfd from './tiffIfd';
import { DataArray } from './types';
import { decompressZlib } from './zlib';

export function unsupported(type: string, value: any): Error {
  return new Error(`Unsupported ${type}: ${value}`);
}

export function getDataArray(
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

export function decompressData(data: DataView, ifd: TiffIfd): DataView {
  const { compression } = ifd;
  switch (compression) {
    case 1: {
      // No compression, nothing to do
      return data;
    }
    case 5: {
      // LZW compression
      return decompressLzw(data);
    }
    case 7: {
      // Photoshop JPEG compression
      const jpegTables = ifd.get('JPEGTables');
      return decompressPhotoshopJpeg(data, jpegTables);
    }
    case 8: {
      // Photoshop Zlib compression
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
