import type TIFFDecoder from './tiffDecoder';
import TiffIfd from './tiffIfd';
import { decompressData, getDataArray } from './utils';

export function readTileData(decoder: TIFFDecoder, ifd: TiffIfd) {
  const width = ifd.width;
  const height = ifd.height;

  const bitDepth = ifd.bitsPerSample;
  const sampleFormat = ifd.sampleFormat;
  const size = width * height * ifd.samplesPerPixel;
  const data = getDataArray(size, bitDepth, sampleFormat);

  const tileLength = ifd.tileLength as number;
  const tileWidth = ifd.tileWidth as number;
  const tileByteCounts = ifd.tileByteCounts as number[];
  const tileOffsets = ifd.tileOffsets as number[];

  // Iterate on each tile
  for (let i = 0; i < tileOffsets.length; i++) {
    const tileData = new DataView(
      decoder.buffer,
      tileOffsets[i],
      tileByteCounts[i],
    );

    const dataToFill = decompressData(tileData, ifd.compression);

    console.log(dataToFill);
  }
}
