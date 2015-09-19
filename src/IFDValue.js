'use strict';

var types = new Map([
    [1 , [1, readByte]],    // BYTE
    [2 , [1, readASCII]], // ASCII
    [3 , [2, readShort]],   // SHORT
    [4 , [4, readLong]],    // LONG
    [5 , [8, unreachable]], // RATIONAL
    [6 , [1, unreachable]], // SBYTE
    [7 , [1, unreachable]], // UNDEFINED
    [8 , [2, unreachable]], // SSHORT
    [9 , [4, unreachable]], // SLONG
    [10, [8, unreachable]], // SRATIONAL
    [11, [4, unreachable]], // FLOAT
    [12, [8, unreachable]]  // DOUBLE
]);

exports.getByteLength = function (type, count) {
    return types.get(type)[0] * count;
};

exports.readData = function (decoder, type, count) {
    return types.get(type)[1](decoder, count);
};

function readByte(decoder, count) {
    if (count === 1) return decoder.readUint8();
    var array = new Uint8Array(count);
    for (var i = 0; i < count; i++) {
        array[i] = decoder.readUint8();
    }
    return array;
}

function readASCII(decoder, count) {
    var strings = [];
    var currentString = '';
    for (var i = 0; i < count; i++) {
        var char = String.fromCharCode(decoder.readUint8());
        if (char === '\0') {
            strings.push(currentString);
            currentString = '';
        } else {
            currentString += char;
        }
    }
    if (strings.length === 1) {
        return strings[0];
    } else {
        return strings;
    }
}

function readShort(decoder, count) {
    if (count === 1) return decoder.readUint16();
    var array = new Uint16Array(count);
    for (var i = 0; i < count; i++) {
        array[i] = decoder.readUint16();
    }
    return array;
}

function readLong(decoder, count) {
    if (count === 1) return decoder.readUint32();
    var array = new Uint32Array(count);
    for (var i = 0; i < count; i++) {
        array[i] = decoder.readUint32();
    }
    return array;
}

function unreachable() {
    throw new Error('unreachable');
}
