import Ifd from './ifd';

// eslint-disable-next-line prefer-named-capture-group
const dateTimeRegex = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

export default class TiffIfd extends Ifd {
  public constructor() {
    super('standard');
  }

  // Custom fields
  public get size(): number {
    return this.width * this.height;
  }
  public get width(): number {
    return this.imageWidth;
  }
  public get height(): number {
    return this.imageLength;
  }
  public get components(): number {
    return this.samplesPerPixel;
  }
  public get date(): Date {
    let date = new Date();
    let result = dateTimeRegex.exec(this.dateTime);
    if (result === null) {
      throw new Error(`invalid dateTime: ${this.dateTime}`);
    }
    date.setFullYear(
      Number(result[1]),
      Number(result[2]) - 1,
      Number(result[3]),
    );
    date.setHours(Number(result[4]), Number(result[5]), Number(result[6]));
    return date;
  }

  // IFD fields
  public get newSubfileType(): number {
    return this.get(254);
  }
  public get imageWidth(): number {
    return this.get(256);
  }
  public get imageLength(): number {
    return this.get(257);
  }
  public get bitsPerSample(): number {
    return this.get(258);
  }
  public get compression(): number {
    return this.get(259) || 1;
  }
  public get type(): number {
    return this.get(262);
  }
  public get fillOrder(): number {
    return this.get(266) || 1;
  }
  public get documentName(): string | undefined {
    return this.get(269);
  }
  public get imageDescription(): string | undefined {
    return this.get(270);
  }
  public get stripOffsets(): number[] {
    return alwaysArray(this.get(273));
  }
  public get orientation(): number {
    return this.get(274);
  }
  public get samplesPerPixel(): number {
    return this.get(277);
  }
  public get rowsPerStrip(): number {
    return this.get(278);
  }
  public get stripByteCounts(): number[] {
    return alwaysArray(this.get(279));
  }
  public get minSampleValue(): number {
    return this.get(280) || 0;
  }
  public get maxSampleValue(): number {
    return this.get(281) || Math.pow(2, this.bitsPerSample) - 1;
  }
  public get xResolution(): number {
    return this.get(282);
  }
  public get yResolution(): number {
    return this.get(283);
  }
  public get planarConfiguration(): number {
    return this.get(284) || 1;
  }
  public get resolutionUnit(): number {
    return this.get(296) || 2;
  }
  public get dateTime(): string {
    return this.get(306);
  }
  public get predictor(): number {
    return this.get(317) || 1;
  }
  public get sampleFormat(): number {
    return this.get(339) || 1;
  }
  public get sMinSampleValue(): number {
    return this.get(340) || this.minSampleValue;
  }
  public get sMaxSampleValue(): number {
    return this.get(341) || this.maxSampleValue;
  }
  public get palette(): [number, number, number][] | undefined {
    const totalColors = 2 ** this.bitsPerSample;
    const colorMap: number[] = this.get(320);
    if (!colorMap) return undefined;
    if (colorMap.length !== 3 * totalColors) {
      throw new Error(`ColorMap size must be ${totalColors}`);
    }
    const palette: [number, number, number][] = [];
    for (let i = 0; i < totalColors; i++) {
      palette.push([
        colorMap[i],
        colorMap[i + totalColors],
        colorMap[i + 2 * totalColors],
      ]);
    }
    return palette;
  }
}

function alwaysArray(value: number | number[]): number[] {
  if (typeof value === 'number') return [value];
  return value;
}
