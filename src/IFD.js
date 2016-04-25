'use strict';

const dateTimeRegex = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

class IFD {
    constructor() {
        this.fields = new Map();
    }

    // Custom fields
    get size() {
        return this.width * this.height;
    }
    get width() {
        return this.imageWidth;
    }
    get height() {
        return this.imageLength;
    }
    get components() {
        return this.samplesPerPixel;
    }
    get date() {
        var date = new Date();
        var result = dateTimeRegex.exec(this.dateTime);
        date.setFullYear(result[1], result[2] - 1, result[3]);
        date.setHours(result[4], result[5], result[6]);
        return date;
    }

    // IFD fields
    get newSubfileType() {
        return this.fields.get(254)
    }
    get imageWidth() {
        return this.fields.get(256);
    }
    get imageLength() {
        return this.fields.get(257);
    }
    get bitsPerSample() {
        return this.fields.get(258);
    }
    get compression() {
        return this.fields.get(259) || 1;
    }
    get type() {
        return this.fields.get(262);
    }
    get fillOrder() {
        return this.fields.get(266) || 1;
    }
    get documentName() {
        return this.fields.get(269);
    }
    get imageDescription() {
        return this.fields.get(270);
    }
    get stripOffsets() {
        return alwaysArray(this.fields.get(273));
    }
    get orientation() {
        return this.fields.get(274);
    }
    get samplesPerPixel() {
        return this.fields.get(277);
    }
    get rowsPerStrip() {
        return this.fields.get(278);
    }
    get stripByteCounts() {
        return alwaysArray(this.fields.get(279));
    }
    get minSampleValue() {
        return this.fields.get(280) || 0;
    }
    get maxSampleValue() {
        return this.fields.get(281) || Math.pow(2, this.bitsPerSample) - 1;
    }
    get xResolution() {
        return this.fields.get(282);
    }
    get yResolution() {
        return this.fields.get(283);
    }
    get planarConfiguration() {
        return this.fields.get(284) || 1;
    }
    get resolutionUnit() {
        return this.fields.get(296) || 2;
    }
    get dateTime() {
        return this.fields.get(306);
    }
    get predictor() {
        return this.fields.get(317) || 1;
    }
    get sampleFormat() {
        return this.fields.get(339) || 1;
    }
    get sMinSampleValue() {
        return this.fields.get(340) || this.minSampleValue;
    }
    get sMaxSampleValue() {
        return this.fields.get(341) || this.maxSampleValue;
    }
}

module.exports = IFD;

function alwaysArray(value) {
    if (typeof value === 'number') return [value];
    return value;
}