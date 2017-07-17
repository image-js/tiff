import TIFFDecoder from './tiffDecoder';

function decodeTIFF(data, options) {
    if (options === undefined) options = {};
    const decoder = new TIFFDecoder(data, options);
    return decoder.decode(options);
}

export {
    decodeTIFF as decode
};
