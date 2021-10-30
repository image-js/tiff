import { readFileSync } from 'fs';
import { join } from 'path';

import { decode } from '..';

function readImage(file: string): Buffer {
  return readFileSync(join(__dirname, '../../img', file));
}

interface TiffFile {
  name: string;
  width: number;
  height: number;
  bitsPerSample: number;
  components: number;
  alpha?: boolean;
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
];
const cases = files.map(
  (file) => [file.name, file, readImage(file.name)] as const,
);

const stack = readImage('stack.tif');

test.each(cases)('should decode %s', (name, file, image) => {
  const result = decode(image);
  expect(result).toHaveLength(1);
  const { data, bitsPerSample, width, height, components, alpha } = result[0];
  expect(width).toBe(file.width);
  expect(height).toBe(file.height);
  expect(components).toBe(file.components);
  expect(bitsPerSample).toBe(file.bitsPerSample);
  expect(data).toHaveLength(file.width * file.height * file.components);
  expect(alpha).toBe(file.alpha ? true : false);
});

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
  const result = decode(readImage('grey8.tif'), { onlyFirst: true });
  expect(result[0]).toHaveProperty('data');
});

test('should omit data', () => {
  const result = decode(readImage('grey8.tif'), { ignoreImageData: true });
  expect(result[0].data).toStrictEqual(new Uint8Array());
});

test('should read exif data', () => {
  const result = decode(readImage('grey8.tif'), {
    onlyFirst: true,
    ignoreImageData: true,
  });
  // @ts-ignore
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

test('should decode palette', () => {
  const decoded = decode(readImage('palette.tif'));
  expect(decoded).toHaveLength(1);
  const { palette } = decoded[0];
  expect(palette).toHaveLength(256);
  // @ts-ignore
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
