'use strict';

const fs = require('fs');
const TIFFDecoder = require('..').TIFFDecoder;

var img = fs.readFileSync(__dirname + '/img/vol_denoised_dfof_0.tif');

var decoder = new TIFFDecoder(img);
var result = decoder.decode();

var first = result.ifd[0];

console.log(first.sampleFormat);

console.log(first.minSampleValue);
console.log(first.maxSampleValue);

console.log((first.bitsPerSample));

console.log(first.sMinSampleValue);
console.log(first.sMaxSampleValue);

//for (var ifd of result.ifd) {
  //  console.log(ifd)
    //console.log(ifd.sampleFormat);
//}

//console.log(result.ifd[0].fields);
//console.log(result.ifd[0].data.slice(0, 10));
