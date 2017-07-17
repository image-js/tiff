import TIFFDecoder from './tiffDecoder';

function decodeTIFF(data, options = {}) {
    const decoder = new TIFFDecoder(data, options);
    return decoder.decode(options);
}

export {
    decodeTIFF as decode
};
