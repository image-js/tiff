'use strict';

const Buffer = require('buffer').Buffer;

class BinaryReader {
    constructor(imageData) {
        if (Buffer.isBuffer(imageData)) {
            imageData = imageData.buffer;
        }
        if (!(imageData instanceof ArrayBuffer)) {
            throw new Error('Expecting an ArrayBuffer');
        }
        this.data = new DataView(imageData);
        this.offset = 0;
        this.littleEndian = true;
    }

    readUint8() {
        return this.data.getUint8(this.offset++);
    }

    readUint16() {
        var value = this.data.getUint16(this.offset, this.littleEndian);
        this.offset += 2;
        return value;
    }

    readUint32() {
        var value = this.data.getUint32(this.offset, this.littleEndian);
        this.offset += 4;
        return value;
    }

    setBigEndian() {
        this.littleEndian = false;
    }

    forward(n) {
        this.offset += n;
    }

    goto(offset) {
        this.offset = offset;
    }
}

module.exports = BinaryReader;
