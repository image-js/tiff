'use strict';

const fs = require('fs');
const TIFFDecoder = require('..').TIFFDecoder;

const files = ['grey8.tif', 'grey16.tif'];
const dir = __dirname + '/img/';

describe('TIFF decoder', function () {
    it('should decode', function () {
        for (var i = 0; i < files.length; i++) {
            const file = fs.readFileSync(dir + files[i]);
            const decoder = new TIFFDecoder(file);
            const result = decoder.decode();
            result.ifd.length.should.equal(1);
        }
    });
});
