'use strict';

const fs = require('fs');
const tiff = require('..');

const files = ['grey8.tif', 'grey16.tif'];
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
        result.should.not.have.property('data');
    });
});
