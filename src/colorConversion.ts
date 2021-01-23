import TiffIfd from './tiffIfd';

export function convertWhiteIsZero(ifd: TiffIfd) {
  // WhiteIsZero: we invert the values
  const bitDepth = ifd.bitsPerSample;
  const maxValue = Math.pow(2, bitDepth) - 1;
  for (let i = 0; i < ifd.data.length; i++) {
    ifd.data[i] = maxValue - ifd.data[i];
  }
}

export function convertYCbCr(ifd: TiffIfd) {
  throw new Error('TODO: convert YCbCr');
}
