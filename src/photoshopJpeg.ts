import { decode } from 'jpeg-js';

export function decompressPhotoshopJpeg(
  stripData: DataView,
  jpegTables: number[] | undefined,
): DataView {
  console.log(jpegTables);
  // if (jpegTables) {
  //   throw new Error('Images compressed with JPEGTables are not supported');
  // }
  const decoded = decode(
    new Uint8Array(
      stripData.buffer,
      stripData.byteOffset,
      stripData.byteLength,
    ),
    {
      colorTransform: false,
      useTArray: true,
      formatAsRGBA: false,
    },
  );
  throw new Error('todo: decompress JPEG');
}
