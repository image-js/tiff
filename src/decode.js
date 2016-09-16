'use strict';

const TIFFDecoder = require('./TIFFDecoder');

module.exports = function decodeTIFF(data, options) {
    const decoder = new TIFFDecoder(data);
    return decoder.decode(options);
};
