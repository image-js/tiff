import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { decompressLzw } from '../lzw.ts';

describe('lzw', () => {
  it('1', () => {
    const buffer = readFileSync(join(import.meta.dirname, 'data/1.strip'));
    const result = decompressLzw(
      new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength),
    );

    expect(result.byteLength).toBe(7770);
    expect(
      new Uint8Array(
        result.buffer,
        result.byteOffset,
        result.byteLength,
      ).reduce((sum, current) => sum + current, 0),
    ).toBe(675);
  });

  it('173', () => {
    const buffer = readFileSync(join(import.meta.dirname, 'data/173.strip'));
    const result = decompressLzw(
      new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength),
    );

    expect(result.byteLength).toBe(7770);
    expect(
      new Uint8Array(
        result.buffer,
        result.byteOffset,
        result.byteLength,
      ).reduce((sum, current) => sum + current, 0),
    ).toBe(38307);
  });

  it('174', () => {
    const buffer = readFileSync(join(import.meta.dirname, 'data/174.strip'));
    const result = decompressLzw(
      new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength),
    );

    expect(result.byteLength).toBe(7770);
  });
});
