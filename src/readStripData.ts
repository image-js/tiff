import type TIFFDecoder from './tiffDecoder';
import TiffIfd from './tiffIfd';
import { DataArray } from './types';
import { decompressData, getDataArray, unsupported } from './utils';

export function readStripData(decoder: TIFFDecoder, ifd: TiffIfd) {
  const width = ifd.width;
  const height = ifd.height;

  const bitDepth = ifd.bitsPerSample;
  const sampleFormat = ifd.sampleFormat;
  const size = width * height * ifd.samplesPerPixel;
  const data = getDataArray(size, bitDepth, sampleFormat);

  const rowsPerStrip = ifd.rowsPerStrip as number;
  const maxPixels = rowsPerStrip * width * ifd.samplesPerPixel;
  const stripOffsets = ifd.stripOffsets as number[];
  const stripByteCounts = ifd.stripByteCounts as number[];

  let remainingPixels = size;
  let pixel = 0;
  for (let i = 0; i < stripOffsets.length; i++) {
    const stripData = new DataView(
      decoder.buffer,
      stripOffsets[i],
      stripByteCounts[i],
    );

    // Last strip can be smaller
    const length = remainingPixels > maxPixels ? maxPixels : remainingPixels;
    remainingPixels -= length;

    const dataToFill = decompressData(stripData, ifd);

    pixel = fillUncompressed(
      decoder,
      bitDepth,
      sampleFormat,
      data,
      dataToFill,
      pixel,
      length,
    );
  }

  ifd.data = data;
}

function fillUncompressed(
  decoder: TIFFDecoder,
  bitDepth: number,
  sampleFormat: number,
  data: DataArray,
  stripData: DataView,
  pixel: number,
  length: number,
): number {
  if (bitDepth === 8) {
    return fill8bit(data, stripData, pixel, length);
  } else if (bitDepth === 16) {
    return fill16bit(data, stripData, pixel, length, decoder.isLittleEndian());
  } else if (bitDepth === 32 && sampleFormat === 3) {
    return fillFloat32(
      data,
      stripData,
      pixel,
      length,
      decoder.isLittleEndian(),
    );
  } else {
    throw unsupported('bitDepth', bitDepth);
  }
}

function fill8bit(
  dataTo: DataArray,
  dataFrom: DataView,
  index: number,
  length: number,
): number {
  for (let i = 0; i < length; i++) {
    dataTo[index++] = dataFrom.getUint8(i);
  }
  return index;
}

function fill16bit(
  dataTo: DataArray,
  dataFrom: DataView,
  index: number,
  length: number,
  littleEndian: boolean,
): number {
  for (let i = 0; i < length * 2; i += 2) {
    dataTo[index++] = dataFrom.getUint16(i, littleEndian);
  }
  return index;
}

function fillFloat32(
  dataTo: DataArray,
  dataFrom: DataView,
  index: number,
  length: number,
  littleEndian: boolean,
): number {
  for (let i = 0; i < length * 4; i += 4) {
    dataTo[index++] = dataFrom.getFloat32(i, littleEndian);
  }
  return index;
}
