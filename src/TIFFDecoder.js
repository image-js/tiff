'use strict';

const debug = require('debug')('tiff');
const BinaryReader = require('./BinaryReader');
const IFD = require('./IFD');
const IFDValue = require('./IFDValue');
const TIFF = require('./TIFF');

class TIFFDecoder extends BinaryReader {
    constructor(data) {
        super(data);
        this.decoded = false;
        this.tiff = null;
        this.currentIFD = null;
        this.nextIFD = 0;
    }

    decode() {
        if (this.decoded) return this.tiff;
        this.tiff = new TIFF();
        this.decodeHeader();
        while (this.nextIFD) {
            this.decodeIFD();
        }
        return this.tiff;
    }

    decodeHeader() {
        debug('decode header');

        // Byte offset
        let value = this.readUint16();
        if (value === 0x4949) {
            debug('BO: little endian');
        } else if (value === 0x4D4D) {
            debug('BO: big endian');
            this.setBigEndian();
        } else {
            throw new Error('invalid byte order: 0x' + value.toString(16));
        }

        // Magic number
        value = this.readUint16();
        if (value !== 42) {
            throw new Error('not a TIFF file');
        }

        // Offset of the first IFD
        this.nextIFD = this.readUint32();
        debug('first IFD: ' + this.nextIFD);
    }

    decodeIFD() {
        debug('decode IFD at ' + this.nextIFD);
        this.goto(this.nextIFD);
        var ifd = new IFD();
        this.tiff.ifd.push(ifd);
        this.currentIFD = ifd;
        const numEntries = this.readUint16();
        debug(numEntries + ' entries');
        for (var i = 0; i < numEntries; i++) {
            this.decodeIFDEntry();
        }
        this.decodeImageData();
        this.currentIFD = null;
        this.nextIFD = this.readUint32();
    }

    decodeIFDEntry() {
        // debug('decode IFD entry');
        let offset = this.offset;
        let tag = this.readUint16();
        let type = this.readUint16();
        let numValues = this.readUint32();

        // todo support other types
        if (type !== 1 && type !== 3 && type !== 4) {
            // debug('unknown type: ' + type);
            this.forward(4);
            return;
        }

        let valueByteLength = IFDValue.getIFDValueByteLength(type, numValues);
        // debug('type ' + type + ', length: ' + valueByteLength);
        if (valueByteLength > 4) {
            this.goto(this.readUint32());
        }

        var value = IFDValue.read(this, type, numValues);
        this.currentIFD.fields.set(tag, value);

        // goto offset of next entry
        this.goto(offset + 12);
    }

    decodeImageData() {
        // todo do the decoding...
    }
}

module.exports = TIFFDecoder;
