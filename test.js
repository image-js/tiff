'use strict';

const fs = require('fs');
const decode = require('.').decode;

var img = fs.readFileSync(__dirname + '/test/img/grey8.tif');

var result = decode(img);
var first = result[0];

console.log(first.fields.get(0x8769) ? true : false);

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
