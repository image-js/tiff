const tiff = require('./lib');

console.log(
  tiff.decode(require('fs').readFileSync('img/image.tif'), {
    // ignoreImageData: true,
  })[0],
);
