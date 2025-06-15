import type TiffIfd from './tiff_ifd.ts';

export function guessStripByteCounts(ifd: TiffIfd): number[] {
  if (ifd.compression !== 1) {
    throw new Error(
      'missing mandatory StripByteCounts field in compressed image',
    );
  }
  const bytesPerStrip =
    ifd.rowsPerStrip *
    ifd.width *
    ifd.samplesPerPixel *
    (ifd.bitsPerSample / 8);
  return new Array(ifd.stripOffsets.length).fill(bytesPerStrip);
}
