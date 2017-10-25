import TIFFDecoder from './tiffDecoder';

function decodeTIFF(data, options = {}) {
    const decoder = new TIFFDecoder(data, options);
    return decoder.decode(options);
}

function isMultiPage(data) {
    const decoder = new TIFFDecoder(data);
    return decoder.isMultiPage;
}

function pageCount(data) {
    const decoder = new TIFFDecoder(data);
    return decoder.pageCount;
}

export {
    decodeTIFF as decode,
    isMultiPage,
    pageCount,
};
