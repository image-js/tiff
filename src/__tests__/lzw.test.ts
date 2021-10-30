import { readFileSync } from 'fs';
import { join } from 'path';

import { decompressLzw } from '../lzw';

describe('lzw', () => {
  it('1', () => {
    const buffer = readFileSync(join(__dirname, 'data/1.strip'));
    const arrayBuffer = new Uint8Array(buffer);
    const result = decompressLzw(new DataView(arrayBuffer.buffer));
    expect(result.byteLength).toBe(7770);
    expect(result.buffer.byteLength).toBe(11136);
    expect(
      new Uint8Array(result.buffer).reduce(
        (sum, current) => (sum += current),
        0,
      ),
    ).toBe(675);
  });
  it('173', () => {
    const buffer = readFileSync(join(__dirname, 'data/173.strip'));
    const arrayBuffer = new Uint8Array(buffer);
    const result = decompressLzw(new DataView(arrayBuffer.buffer));
    expect(result.byteLength).toBe(7770);
    expect(result.buffer.byteLength).toBe(11150);
    expect(
      new Uint8Array(result.buffer).reduce(
        (sum, current) => (sum += current),
        0,
      ),
    ).toBe(38307);
  });
  it('174', () => {
    const buffer = readFileSync(join(__dirname, 'data/174.strip'));
    const arrayBuffer = new Uint8Array(buffer);
    const result = decompressLzw(new DataView(arrayBuffer.buffer));
    expect(result.byteLength).toBe(7770);
  });
});
