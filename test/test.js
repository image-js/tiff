'use strict';

const fs = require('fs');
const TIFFDecoder = require('..').TIFFDecoder;

var img = fs.readFileSync(__dirname + '/img/greyscale_16bits.tif');

var decoder = new TIFFDecoder(img);
var result = decoder.decode();

for (var i of result.ifd[0].fields) {
    console.log(i[0], JSON.stringify(i[1]));
}

//console.log(result.ifd[0].fields);
//console.log(result.ifd[0].data.slice(0, 10));
