import { IOBuffer } from 'iobuffer';

const CLEAR_CODE = 256;
const EOI_CODE = 257;
// 0-255 from the table + 256 for clear code + 257 for end of information code.
const TABLE_START = 258;
const MIN_BIT_LENGTH = 9;

const stringTable: number[][] = [];
for (let i = 0; i < 256; i++) {
  stringTable.push([i]);
}
// Fill the table with dummy data.
// Elements at indices > 257 will be replaced during decompression.
const dummyString = [0];
for (let i = 256; i < 4096; i++) {
  stringTable.push(dummyString);
}

class LzwDecoder {
  private stripArray: Uint8Array;
  private currentBit: number;
  private tableLength: number;
  private currentBitLength: number;
  private outData: IOBuffer;

  public constructor(data: DataView) {
    this.stripArray = new Uint8Array(
      data.buffer,
      data.byteOffset,
      data.byteLength,
    );
    const table = new Map<number, number[]>();
    for (let i = 0; i < 256; i++) {
      table.set(i, [i]);
    }
    this.currentBit = 0;
    this.tableLength = TABLE_START;
    this.currentBitLength = MIN_BIT_LENGTH;
    this.outData = new IOBuffer(data.byteLength);
  }

  public decode(): DataView {
    let code = 0;
    let oldCode = 0;
    while ((code = this.getNextCode()) !== EOI_CODE) {
      if (code === CLEAR_CODE) {
        this.initializeTable();
        code = this.getNextCode();
        if (code === EOI_CODE) {
          break;
        }
        this.writeString(this.stringFromCode(code));
        oldCode = code;
      } else if (this.isInTable(code)) {
        this.writeString(this.stringFromCode(code));
        this.addStringToTable(
          this.stringFromCode(oldCode).concat(this.stringFromCode(code)[0]),
        );
        oldCode = code;
      } else {
        const outString = this.stringFromCode(oldCode).concat(
          this.stringFromCode(oldCode)[0],
        );
        this.writeString(outString);
        this.addStringToTable(outString);
        oldCode = code;
      }
    }
    const outArray = this.outData.toArray();
    return new DataView(
      outArray.buffer,
      outArray.byteOffset,
      outArray.byteLength,
    );
  }

  private initializeTable(): void {
    this.tableLength = TABLE_START;
    this.currentBitLength = MIN_BIT_LENGTH;
  }

  private writeString(string: number[]): void {
    this.outData.writeBytes(string);
  }

  private stringFromCode(code: number): number[] {
    // At this point, `code` must be defined in the table.
    return stringTable[code];
  }

  private isInTable(code: number): boolean {
    return code < this.tableLength;
  }

  private addStringToTable(string: number[]): void {
    stringTable[this.tableLength++] = string;
    if (this.tableLength + 1 === 2 ** this.currentBitLength) {
      this.currentBitLength++;
    }
  }

  private getNextCode(): number {
    const d = this.currentBit % 8;
    const a = this.currentBit >>> 3;
    const de = 8 - d;
    const ef = this.currentBit + this.currentBitLength - (a + 1) * 8;
    let fg = 8 * (a + 2) - (this.currentBit + this.currentBitLength);
    const dg = (a + 2) * 8 - this.currentBit;
    fg = Math.max(0, fg);
    let chunk1 = this.stripArray[a] & (2 ** (8 - d) - 1);
    chunk1 <<= this.currentBitLength - de;
    let chunks = chunk1;
    if (a + 1 < this.stripArray.length) {
      let chunk2 = this.stripArray[a + 1] >>> fg;
      chunk2 <<= Math.max(0, this.currentBitLength - dg);
      chunks += chunk2;
    }
    if (ef > 8 && a + 2 < this.stripArray.length) {
      const hi = (a + 3) * 8 - (this.currentBit + this.currentBitLength);
      const chunk3 = this.stripArray[a + 2] >>> hi;
      chunks += chunk3;
    }
    this.currentBit += this.currentBitLength;
    return chunks;
  }
}

export function decompressLzw(stripData: DataView): DataView {
  return new LzwDecoder(stripData).decode();
}
