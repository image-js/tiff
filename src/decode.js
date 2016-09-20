'use strict';

const TIFFDecoder = require('./tiffDecoder');

module.exports = function decodeTIFF(data, options) {
    const decoder = new TIFFDecoder(data);
    return decoder.decode(options);
};
