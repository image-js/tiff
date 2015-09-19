'use strict';

const fs = require('fs');
const TIFFDecoder = require('..').TIFFDecoder;

var img = fs.readFileSync(__dirname + '/img/CCITT_1.TIF');

var decoder = new TIFFDecoder(img);
var result = decoder.decode();

console.log(result.ifd);
