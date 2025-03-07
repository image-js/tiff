import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { pageCount } from '..';

const files = [
  { name: 'grey8.tif', pages: 1 },
  { name: 'grey16.tif', pages: 1 },
  { name: 'color8.tif', pages: 1 },
  { name: 'color16.tif', pages: 1 },
  { name: 'grey8-multi.tif', pages: 2 },
  { name: 'grey16-multi.tif', pages: 2 },
  { name: 'color8-multi.tif', pages: 2 },
  { name: 'color16-multi.tif', pages: 2 },
];
// const files = ['color8c.tif'];//'grey8.tif', 'grey16.tif', 'color8.tif', 'color16.tif'];
const contents = files.map((file) =>
  readFileSync(join(__dirname, '../../img', file.name)),
);

test('TIFF pageCount', () => {
  for (let i = 0; i < contents.length; i++) {
    const result = pageCount(contents[i]);
    expect(result).toBe(files[i].pages);
  }
});
