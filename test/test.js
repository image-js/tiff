'use strict';

const fs = require('fs');
const should = require('should');
const tiff = require('..');

const files = ['grey8.tif', 'grey16.tif', 'color8.tif', 'color16.tif'];
// const files = ['color8c.tif'];//'grey8.tif', 'grey16.tif', 'color8.tif', 'color16.tif'];
const dir = __dirname + '/img/';
const contents = files.map(file => fs.readFileSync(dir + file));

describe('TIFF decoder', function () {
    it('should decode', function () {
        for (var i = 0; i < contents.length; i++) {
            const result = tiff.decode(contents[i]);
            result.length.should.equal(1);
            result[0].should.have.property('data');
        }
    });
    it('should decode with onlyFirst', function () {
        const result = tiff.decode(contents[0], {onlyFirst: true});
        result.should.have.property('data');
    });
    it('should omit data', function () {
        const result = tiff.decode(contents[0], {ignoreImageData: true});
        should(result[0].data).equal(null);
    });
    it('should read exif data', function () {
        const result = tiff.decode(contents[0], {onlyFirst: true, ignoreImageData: true});
        result.exif.map.should.eql({
            ColorSpace: 65535,
            PixelXDimension: 30,
            PixelYDimension: 90
        });
    });
});
