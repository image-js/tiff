import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { decode } from '../index.ts';

function readImage(file: string): Buffer {
  return readFileSync(join(import.meta.dirname, '../../img', file));
}

interface TiffFile {
  name: string;
  width: number;
  height: number;
  bitsPerSample: number;
  components: number;
  alpha?: boolean;
  pages?: number;
}

const files: TiffFile[] = [
  {
    name: 'color-1px.tif',
    width: 1,
    height: 1,
    bitsPerSample: 8,
    components: 3,
  },
  {
    name: 'image-lzw.tif',
    width: 2590,
    height: 3062,
    bitsPerSample: 8,
    components: 3,
  },
  {
    name: 'image-deflate.tif',
    width: 5100,
    height: 3434,
    bitsPerSample: 8,
    components: 3,
  },
  {
    name: 'color8.tif',
    width: 160,
    height: 120,
    bitsPerSample: 8,
    components: 3,
  },
  {
    name: 'color8-lzw.tif',
    width: 160,
    height: 120,
    bitsPerSample: 8,
    components: 3,
  },
  {
    name: 'color8-alpha.tif',
    width: 800,
    height: 600,
    bitsPerSample: 8,
    components: 4,
    alpha: true,
  },
  {
    name: 'color16.tif',
    width: 160,
    height: 120,
    bitsPerSample: 16,
    components: 3,
  },
  {
    name: 'color16-lzw.tif',
    width: 160,
    height: 120,
    bitsPerSample: 16,
    components: 3,
  },
  { name: 'grey8.tif', width: 30, height: 90, bitsPerSample: 8, components: 1 },
  {
    name: 'grey8-lzw.tif',
    width: 30,
    height: 90,
    bitsPerSample: 8,
    components: 1,
  },
  {
    name: 'grey16.tif',
    width: 30,
    height: 90,
    bitsPerSample: 16,
    components: 1,
  },
  {
    name: 'whiteIsZero.tif',
    width: 1248,
    height: 1248,
    bitsPerSample: 16,
    components: 1,
  },
  {
    name: 'cells.tif',
    width: 2048,
    height: 2048,
    bitsPerSample: 16,
    components: 1,
  },
  {
    name: 'color-5x5.tif',
    width: 5,
    height: 5,
    bitsPerSample: 8,
    components: 3,
  },
  {
    name: 'color-5x5-lzw.tif',
    width: 5,
    height: 5,
    bitsPerSample: 8,
    components: 3,
  },
  {
    name: 'color-5x5-deflate.tif',
    width: 5,
    height: 5,
    bitsPerSample: 8,
    components: 3,
  },
  {
    name: 'color-alpha-2x2.tif',
    width: 2,
    height: 2,
    bitsPerSample: 8,
    components: 4,
    alpha: true,
  },
  {
    name: 'color-alpha-5x5.tif',
    width: 5,
    height: 5,
    bitsPerSample: 8,
    components: 4,
    alpha: true,
  },
  {
    name: 'color-alpha-5x5-lzw.tif',
    width: 5,
    height: 5,
    bitsPerSample: 8,
    components: 4,
    alpha: true,
  },
  {
    name: 'float32.tif',
    width: 141,
    height: 125,
    bitsPerSample: 32,
    components: 1,
    alpha: false,
  },
  {
    name: 'float64.tif',
    width: 851,
    height: 338,
    bitsPerSample: 64,
    components: 1,
    alpha: false,
  },
  {
    name: 'black.tif',
    width: 9192,
    height: 2690,
    bitsPerSample: 16,
    components: 1,
    alpha: false,
  },
  {
    name: 'array-sample-format.tif',
    width: 2,
    height: 2,
    bitsPerSample: 32,
    components: 3,
    alpha: false,
  },
  {
    name: 'tiled.tif',
    width: 2501,
    height: 2001,
    bitsPerSample: 32,
    components: 1,
    alpha: false,
  },
  {
    name: 'bw1bit.tif',
    width: 2,
    height: 2,
    bitsPerSample: 1,
    components: 1,
    alpha: false,
  },
  {
    name: 'bwCross.tif',
    width: 10,
    height: 10,
    bitsPerSample: 1,
    components: 1,
    alpha: false,
  },
  // Checks only the first frame of the image.
  {
    name: 'dog.tiff',
    width: 16,
    height: 16,
    bitsPerSample: 1,
    components: 4,
    alpha: true,
    pages: 8,
  },
];
const cases = files.map(
  (file) => [file.name, file, readImage(file.name)] as const,
);

const stack = readImage('stack.tif');

test.each(cases)(
  'should decode %s',
  { timeout: 30_000 },
  (name, file, image) => {
    const result = decode(image);

    expect(result).toHaveLength(file.pages ?? 1);
    const { data, bitsPerSample, width, height, components, alpha } = result[0];
    expect(width).toBe(file.width);
    expect(height).toBe(file.height);
    expect(components).toBe(file.components);
    expect(bitsPerSample).toBe(file.bitsPerSample);
    const size = file.width * file.height * file.components;
    expect(data).toHaveLength(size);
    expect(alpha).toBe(Boolean(file.alpha));
  },
);

// prettier-ignore
const expectedRgb8BitData = Uint8Array.from([
  255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 0, 0, 0,
  255, 0, 0, 0, 255, 0, 0, 0, 255, 128, 128, 128, 128, 128, 128,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  0, 255, 255, 255, 0, 255, 255, 255, 0, 128, 128, 128, 128, 128, 128,
  0, 255, 255, 255, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0,
]);

test('should decode RGB 8bit data', () => {
  const [result] = decode(readImage('color-5x5.tif'));
  expect(result.data).toStrictEqual(expectedRgb8BitData);
});

test('should decode RGB 8bit data with LZW compression', () => {
  const [result] = decode(readImage('color-5x5-lzw.tif'));
  expect(result.data).toStrictEqual(expectedRgb8BitData);
});

// prettier-ignore
const expectedRgb8BitAlphaData = Uint8Array.from([
  0, 0, 0, 0, 0, 255, 0, 54, 0, 0, 255, 102, 0, 0, 0, 152, 0, 0, 0, 203,
  255, 0, 0, 31, 0, 255, 0, 78, 0, 0, 255, 255, 128, 128, 128, 255, 128, 128, 128, 255,
  255, 255, 255, 54, 255, 255, 255, 255, 255, 255, 255, 127, 255, 255, 255, 255, 255, 255, 255, 255,
  0, 255, 255, 78, 255, 0, 255, 255, 255, 255, 0, 255, 128, 128, 128, 177, 128, 128, 128, 255,
  0, 255, 255, 102, 255, 0, 255, 255, 255, 255, 0, 255, 0, 0, 0, 255, 0, 0, 0, 229
]);

test('should decode RGB 8bit data with pre-multiplied alpha', () => {
  const [result] = decode(readImage('color-alpha-5x5.tif'));
  expect(result.data).toStrictEqual(expectedRgb8BitAlphaData);
});

test('should decode RGB 8bit data with pre-multiplied alpha and LZW compression', () => {
  const [result] = decode(readImage('color-alpha-5x5-lzw.tif'));
  expect(result.data).toStrictEqual(expectedRgb8BitAlphaData);
});

test('should decode RGB 8bit data with pre-multiplied alpha and lost precision', () => {
  // prettier-ignore
  const expectedData = Uint8Array.from([
    255, 0, 0, 6, 255, 0, 0, 6,
    128, 0, 0, 6, 128, 0, 0, 6,
  ]);
  const [result] = decode(readImage('color-alpha-2x2.tif'));
  expect(result.data).toStrictEqual(expectedData);
});

test('should decode with onlyFirst', () => {
  const result = decode(readImage('grey8.tif'), { pages: [0] });
  expect(result[0]).toHaveProperty('data');
});

test('should omit data', () => {
  const result = decode(readImage('grey8.tif'), { ignoreImageData: true });
  expect(result[0].data).toStrictEqual(new Uint8Array());
});

test('should read exif data', () => {
  const result = decode(readImage('grey8.tif'), {
    pages: [0],
    ignoreImageData: true,
  });
  // @ts-expect-error We know exif is defined.
  expect(result[0].exif.map).toStrictEqual({
    ColorSpace: 65535,
    PixelXDimension: 30,
    PixelYDimension: 90,
  });
});

test('should decode stacks', () => {
  const decoded = decode(stack);
  expect(decoded).toHaveLength(10);
  for (const image of decoded) {
    expect(image.width).toBe(128);
    expect(image.height).toBe(128);
  }
});

test('specify pages to decode', () => {
  const decoded = decode(stack, { pages: [0, 2, 4, 6, 8] });
  expect(decoded).toHaveLength(5);
  for (const image of decoded) {
    expect(image.width).toBe(128);
    expect(image.height).toBe(128);
  }
});

test('should throw if pages invalid', () => {
  expect(() => decode(stack, { pages: [-1] })).toThrow(
    'Index -1 is invalid. Must be a positive integer.',
  );
  expect(() => decode(stack, { pages: [0.5] })).toThrow(
    'Index 0.5 is invalid. Must be a positive integer.',
  );
  expect(() => decode(stack, { pages: [20] })).toThrow(
    'Index 20 is out of bounds. The stack only contains 10 images.',
  );
});

test('should decode palette', () => {
  const decoded = decode(readImage('palette.tif'));
  expect(decoded).toHaveLength(1);
  const { palette } = decoded[0];
  expect(palette).toHaveLength(256);
  // @ts-expect-error We know palette is defined.
  expect(palette[0]).toStrictEqual([65535, 0, 0]);
});

test('should decode image compressed with deflate algorithm', () => {
  const decoded = decode(readImage('tile_rgb_deflate.tif'));
  expect(decoded).toHaveLength(1);
  expect(decoded[0]).toMatchObject({
    alpha: false,
    bitsPerSample: 16,
    components: 3,
    compression: 8,
    width: 128,
    height: 128,
  });
});
test('should decode basic 2x2 1-bit image ', () => {
  const decoded = decode(readImage('bw1bit.tif'));
  expect(decoded).toHaveLength(1);
  expect(decoded[0]).toMatchObject({
    alpha: false,
    bitsPerSample: 1,
    components: 1,
    compression: 1,
    width: 2,
    height: 2,
  });
  expect(decoded[0].data).toEqual(new Uint8Array([1, 0, 0, 1]));
});
test('should decode 10x10 1-bit image as a cross', () => {
  const decoded = decode(readImage('bwCross.tif'));
  expect(decoded).toHaveLength(1);
  expect(decoded[0]).toMatchObject({
    alpha: false,
    bitsPerSample: 1,
    components: 1,
    compression: 1,
    width: 10,
    height: 10,
  });
  expect(decoded[0].data).toEqual(
    new Uint8Array(
      [
        [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
      ].flat(),
    ),
  );
});
test('should decode 15x15 image with tile data', () => {
  const decoded = decode(readImage('crosshair_tiled.tif'));
  expect(decoded).toHaveLength(1);
  expect(decoded[0]).toMatchObject({
    alpha: false,
    bitsPerSample: 1,
    components: 1,
    compression: 1,
    width: 15,
    height: 15,
  });
  expect(decoded[0].data).toEqual(
    new Uint8Array(
      [
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
        [1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1],
        [1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1],
        [1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1],
        [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
      ].flat(),
    ),
  );
});

test('should decode multiframe image', () => {
  const decoded = decode(readImage('dog.tiff'));
  expect(decoded).toHaveLength(8);
  expect(decoded[0]).toMatchObject({
    alpha: true,
    bitsPerSample: 1,
    components: 4,
    compression: 1,
    width: 16,
    height: 16,
  });

  expect(decoded[0].imageWidth).toEqual(16);
  // last row of the first frame
  const firstFrameLastRow = new Uint8Array([
    1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1,
    1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1,
    0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0,
  ]);
  expect(decoded[1].imageLength).toEqual(16);
  expect(decoded[1].imageWidth).toEqual(16);

  expect(decoded[0].data.slice(960, 1024)).toEqual(firstFrameLastRow);
  // twelveth row of the second frame
  const secondFrameTwelvethRow = new Uint8Array([
    1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1,
    0, 1, 0, 1, 0, 1, 0,
  ]);
  expect(decoded[1].samplesPerPixel).toEqual(2);
  expect(decoded[1].data.slice(352, 384)).toEqual(secondFrameTwelvethRow);
});
