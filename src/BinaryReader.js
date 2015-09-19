'use strict';

class BinaryReader {
    constructor(imageData) {
        if (imageData.buffer) {
            imageData = imageData.buffer;
        }
        this.data = new DataView(imageData);
        this.offset = 0;
        this.littleEndian = true;
    }

    readInt8() {
        return this.data.getInt8(this.offset++);
    }

    readUint8() {
        return this.data.getUint8(this.offset++);
    }

    readInt16() {
        var value = this.data.getInt16(this.offset, this.littleEndian);
        this.offset += 2;
        return value;
    }

    readUint16() {
        var value = this.data.getUint16(this.offset, this.littleEndian);
        this.offset += 2;
        return value;
    }

    readInt32() {
        var value = this.data.getInt32(this.offset, this.littleEndian);
        this.offset += 4;
        return value;
    }

    readUint32() {
        var value = this.data.getUint32(this.offset, this.littleEndian);
        this.offset += 4;
        return value;
    }

    readFloat32() {
        var value = this.data.getFloat32(this.offset, this.littleEndian);
        this.offset += 4;
        return value;
    }

    readFloat64() {
        var value = this.data.getFloat64(this.offset, this.littleEndian);
        this.offset += 8;
        return value;
    }

    setBigEndian() {
        this.littleEndian = false;
    }

    setLittleEndian() {
        this.littleEndian = true;
    }

    forward(n) {
        this.offset += n;
    }

    goto(offset) {
        this.offset = offset;
    }
}

module.exports = BinaryReader;
