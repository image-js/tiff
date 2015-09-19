'use strict';

var types = new Map([
    [1 , 8],  // BYTE
    [2 , 8],  // ASCII
    [3 , 16], // SHORT
    [4 , 32], // LONG
    [5 , 64], // RATIONAL
    [6 , 8],  // SBYTE
    [7 , 8],  // UNDEFINED
    [8 , 16], // SSHORT
    [9 , 32], // SLONG
    [10, 64], // SRATIONAL
    [11, 32], // FLOAT
    [12, 64]  // DOUBLE
]);

exports.getIFDValueByteLength = function (type, count) {
    return types.get(type) * count;
};

exports.read = function (decoder, type, count) {
    switch (type) {
        case 1:
            return readByte(decoder, count);
        case 3:
            return readShort(decoder, count);
        case 4:
            return readLong(decoder, count);
        default:
            throw new Error('unreachable');
    }
};

function readByte(decoder, count) {
    if (count === 1) return decoder.readUint8();
    var array = new Uint8Array(count);
    for (var i = 0; i < count; i++) {
        array[i] = decoder.readUint8();
    }
}

function readShort(decoder, count) {
    if (count === 1) return decoder.readUint16();
    var array = new Uint16Array(count);
    for (var i = 0; i < count; i++) {
        array[i] = decoder.readUint16();
    }
}

function readLong(decoder, count) {
    if (count === 1) return decoder.readUint32();
    var array = new Uint32Array(count);
    for (var i = 0; i < count; i++) {
        array[i] = decoder.readUint32();
    }
}
