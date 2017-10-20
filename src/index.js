import TIFFDecoder from './tiffDecoder';

function decodeTIFF(data, options = {}) {
    const decoder = new TIFFDecoder(data, options);
    return decoder.decode(options);
}

function checkMultiPage(data) {
    const decoder = new TIFFDecoder(data);
    return decoder.isMultiPage;
}

function countPages(data) {
    const decoder = new TIFFDecoder(data);
    return decoder.pageCount;
}

export {
    decodeTIFF as decode,
    checkMultiPage,
    countPages,
};
