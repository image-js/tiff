import { readFileSync } from 'fs';
import { join } from 'path';

import { decode } from '..';

function readImage(file: string): Buffer {
  return readFileSync(join(__dirname, '../../img', file));
}

const files = [
  'color8.tif',
  'color8-lzw.tif',
  'color16.tif',
  'color16-lzw.tif',
  'grey8.tif',
  'grey8-lzw.tif',
  'grey16.tif',
  'whiteIsZero.tif',
];
const cases = files.map((name) => [name, readImage(name)] as const);

const stack = readImage('stack.tif');

test.each(cases)('should decode %s', (_, image) => {
  const result = decode(image);
  expect(result).toHaveLength(1);
  expect(result[0]).toHaveProperty('data');
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
