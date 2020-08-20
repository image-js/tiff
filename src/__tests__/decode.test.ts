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
}

const files: TiffFile[] = [
  // TODO: Unsupported LZW compression?
  // 'color-1px.tif',
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
  // TODO: implement alpha channel support.
  // {
  //   name: 'color8-alpha.tif',
  //   width: 800,
  //   height: 600,
  //   bitsPerSample: 8,
  //   components: 4,
  // },
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
];
const cases = files.map((file) => [file, readImage(file.name)] as const);

const stack = readImage('stack.tif');

test.each(cases)('should decode %s', (file, image) => {
  const result = decode(image);
  expect(result).toHaveLength(1);
  const { data, bitsPerSample, width, height, components } = result[0];
  expect(width).toBe(file.width);
  expect(height).toBe(file.height);
  expect(components).toBe(file.components);
  expect(bitsPerSample).toBe(file.bitsPerSample);
  expect(data).toHaveLength(file.width * file.height * file.components);
});

test('should decode RGB 8bit', () => {
  const [result] = decode(readImage('color-5x5.tif'));
  expect(result.width).toBe(5);
  expect(result.height).toBe(5);
  expect(result.bitsPerSample).toBe(8);
  expect(result.components).toBe(3);
  expect(result.data).toStrictEqual(
    // prettier-ignore
    Uint8Array.from([
      255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 0, 0, 0,
      255, 0, 0, 0, 255, 0, 0, 0, 255, 128, 128, 128, 128, 128, 128,
      255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
      0, 255, 255, 255, 0, 255, 255, 255, 0, 128, 128, 128, 128, 128, 128,
      0, 255, 255, 255, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0,
    ]),
  );
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
