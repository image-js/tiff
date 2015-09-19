'use strict';

class IFD {
    constructor() {
        this.fields = new Map();
    }

    // IFD fields
    get size() {
        return this.width * this.height;
    }
    get width() { // ImageWidth
        return this.fields.get(256);
    }
    get height() { // ImageLength
        return this.fields.get(257);
    }
    get bitsPerSample() {
        return this.fields.get(258);
    }
    get compression() { // Compression
        return this.fields.get(259);
    }
    get type() { // PhotometricInterpretation
        return this.fields.get(262);
    }
    get stripOffsets() { // StripOffsets
        return alwaysArray(this.fields.get(273));
    }
    get rowsPerStrip() { // RowsPerStrip
        return this.fields.get(278);
    }
    get stripByteCounts() {
        return alwaysArray(this.fields.get(279));
    }
    get xResolution() { // XResolution
        return this.fields.get(282);
    }
    get yResolution() { // YResolution
        return this.fields.get(283);
    }
    get resolutionUnit() { // ResolutionUnit
        return this.fields.get(296) || 2;
    }
}

module.exports = IFD;

function alwaysArray(value) {
    if (typeof value === 'number') return [value];
    return value;
}