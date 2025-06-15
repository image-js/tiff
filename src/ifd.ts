import * as exif from './tags/exif.ts';
import * as gps from './tags/gps.ts';
import * as standard from './tags/standard.ts';
import type { DataArray, IFDKind } from './types.ts';

const tags = {
  standard,
  exif,
  gps,
};

export default class IFD {
  public kind: IFDKind;
  public data: DataArray;
  public fields: Map<number, any>;
  public exif: IFD | undefined;
  public gps: IFD | undefined;

  private _hasMap: boolean;
  private _map: any;

  public constructor(kind: IFDKind) {
    if (!kind) {
      throw new Error('missing kind');
    }
    this.data = new Uint8Array();
    this.fields = new Map();
    this.kind = kind;
    this._hasMap = false;
    this._map = {};
  }

  public get(tag: number | string): any {
    if (typeof tag === 'number') {
      return this.fields.get(tag);
    } else if (typeof tag === 'string') {
      return this.fields.get(tags[this.kind].tagsByName[tag]);
    } else {
      throw new Error('expected a number or string');
    }
  }

  public get map(): Record<string, any> {
    if (!this._hasMap) {
      const taglist = tags[this.kind].tagsById;
      for (const key of this.fields.keys()) {
        if (taglist[key]) {
          this._map[taglist[key]] = this.fields.get(key);
        }
      }
      this._hasMap = true;
    }
    return this._map;
  }
}
