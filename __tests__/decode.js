import { readFileSync } from 'fs';
import { join } from 'path';

import { decode } from '../src';

const files = ['grey8.tif', 'grey16.tif', 'color8.tif', 'color16.tif'];
// const files = ['color8c.tif'];//'grey8.tif', 'grey16.tif', 'color8.tif', 'color16.tif'];
const contents = files.map((file) => readFileSync(join(__dirname, 'img', file)));

describe('TIFF decoder', () => {
  it('should decode', () => {
    for (var i = 0; i < contents.length; i++) {
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
    const result = decode(contents[0], { onlyFirst: true, ignoreImageData: true });
    expect(result.exif.map).toEqual({
      ColorSpace: 65535,
      PixelXDimension: 30,
      PixelYDimension: 90
    });
  });
});
