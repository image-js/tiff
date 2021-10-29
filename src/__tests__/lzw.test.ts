import { read, readFileSync } from 'fs';
import { join } from 'path';

import { decompressLzw } from '../lzw';

describe('lzw', () => {
  it('1', () => {
    const buffer = readFileSync(join(__dirname, 'data/1'));
    const arrayBuffer = new Uint8Array(buffer);
    const result = decompressLzw(new DataView(arrayBuffer.buffer));
  });
  it('173', () => {
    const buffer = readFileSync(join(__dirname, 'data/173'));
    const arrayBuffer = new Uint8Array(buffer);
    const result = decompressLzw(new DataView(arrayBuffer.buffer));
  });
  it.only('174', () => {
    const buffer = readFileSync(join(__dirname, 'data/174'));
    const arrayBuffer = new Uint8Array(buffer);
    const result = decompressLzw(new DataView(arrayBuffer.buffer));
  });
});
