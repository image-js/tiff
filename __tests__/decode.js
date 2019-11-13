import { readFileSync } from 'fs';
import { join } from 'path';

import { decode } from '../src';

function readImage(file) {
  return readFileSync(join(__dirname, 'img', file));
}

const files = [
  'grey8.tif',
  'grey16.tif',
  'color8.tif',
  'color16.tif',
  'whiteIsZero.tif',
];
// const files = ['color8c.tif'];//'grey8.tif', 'grey16.tif', 'color8.tif', 'color16.tif'];
const contents = files.map(readImage);

const stack = readImage('stack.tif');

describe('TIFF decoder', () => {
  it('should decode', () => {
    for (let i = 0; i < contents.length; i++) {
      const result = decode(contents[i]);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('data');
    }
  });
  it('should decode with onlyFirst', () => {
    const result = decode(contents[0], { onlyFirst: true });
    expect(result).toHaveProperty('data');
  });
  it('should omit data', () => {
    const result = decode(contents[0], { ignoreImageData: true });
    expect(result[0].data).toBeNull();
  });
  it('should read exif data', () => {
    const result = decode(contents[0], {
      onlyFirst: true,
      ignoreImageData: true,
    });
    expect(result.exif.map).toStrictEqual({
      ColorSpace: 65535,
      PixelXDimension: 30,
      PixelYDimension: 90,
    });
  });
  it('should decode stacks', () => {
    const decoded = decode(stack);
    expect(decoded).toHaveLength(10);
    for (const image of decoded) {
      expect(image.width).toBe(128);
      expect(image.height).toBe(128);
    }
  });
});
