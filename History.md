# [4.2.0](https://github.com/image-js/tiff/compare/v4.1.3...v4.2.0) (2020-08-21)


### Features

* add support for alpha channel and compressed 16-bit images ([5f2e612](https://github.com/image-js/tiff/commit/5f2e6128ed7b096290c1ebe0b861a61d3849b255))



## [4.1.3](https://github.com/image-js/tiff/compare/v4.1.2...v4.1.3) (2020-08-07)


### Bug Fixes

* support images that do not define `samplesPerPixel` ([2c2587b](https://github.com/image-js/tiff/commit/2c2587b4307ef22225d38f5d24968c678bf6fa54))



## [4.1.2](https://github.com/image-js/tiff/compare/v4.1.1...v4.1.2) (2020-08-06)


### Bug Fixes

* really correct decoding of RGB images ([5595c53](https://github.com/image-js/tiff/commit/5595c539469dfd3e8e2b617511f8327b94c86a77))



## [4.1.1](https://github.com/image-js/tiff/compare/v4.1.0...v4.1.1) (2020-08-06)


### Bug Fixes

* correctly support RGB images ([d546610](https://github.com/image-js/tiff/commit/d5466101845fd90c8a5225857ff0d7216d51b88d))



# [4.1.0](https://github.com/image-js/tiff/compare/v4.0.0...v4.1.0) (2020-08-04)


### Features

* support LZW compression ([20fbb50](https://github.com/image-js/tiff/commit/20fbb501b8855489e91ae22f519760c2112aae68))



# [4.0.0](https://github.com/image-js/tiff/compare/v3.0.1...v4.0.0) (2020-01-23)


### chore

* stop supporting Node.js 6 and 8 ([1156f52](https://github.com/image-js/tiff/commit/1156f52aaa4210dfb9ee2fef052b775298b86b81))


### Features

* add support for palette images ([d31413b](https://github.com/image-js/tiff/commit/d31413b09ed8f589107f7c1ffae06d5ea2e22b49))


### BREAKING CHANGES

* Node.js 6 and 8 are no longer supported.



<a name="3.0.1"></a>
## [3.0.1](https://github.com/image-js/tiff/compare/v3.0.0...v3.0.1) (2018-09-12)


### Bug Fixes

* support WhiteIsZero ([bf7a4ca](https://github.com/image-js/tiff/commit/bf7a4ca)), closes [#14](https://github.com/image-js/tiff/issues/14)



<a name="3.0.0"></a>
# [3.0.0](https://github.com/image-js/tiff/compare/v2.1.0...v3.0.0) (2017-10-25)


### Chores

* remove Node 4 from travis ([5c743d2](https://github.com/image-js/tiff/commit/5c743d2))


### Features

* add pageCount and isMultiPage functions ([7dac89f](https://github.com/image-js/tiff/commit/7dac89f))


### BREAKING CHANGES

* Stop support for Node 4



<a name="2.1.0"></a>
# [2.1.0](https://github.com/image-js/tiff/compare/v2.0.1...v2.1.0) (2016-11-05)


### Features

* add support for uncompressed RGB data ([b3ffff7](https://github.com/image-js/tiff/commit/b3ffff7))



<a name="2.0.1"></a>
## [2.0.1](https://github.com/image-js/tiff/compare/v2.0.0...v2.0.1) (2016-09-20)


### Bug Fixes

* return decimal numbers for rational types ([c3bad6c](https://github.com/image-js/tiff/commit/c3bad6c))



<a name="2.0.0"></a>
# [2.0.0](https://github.com/image-js/tiff/compare/v1.1.1...v2.0.0) (2016-09-20)


### Code Refactoring

* hide the decoder class behind a decode function ([78603ff](https://github.com/image-js/tiff/commit/78603ff))


### Features

* add support for decoding EXIF and GPS IFDs ([b2766a5](https://github.com/image-js/tiff/commit/b2766a5))
* allow to pass iobuffer options to the decoder ([97f0f8e](https://github.com/image-js/tiff/commit/97f0f8e))


### BREAKING CHANGES

*  The API has changed. Use `tiff.decode()` instead of `TIFFDecoder`.



<a name="1.1.1"></a>
## [1.1.1](https://github.com/image-js/tiff/compare/v1.1.0...v1.1.1) (2016-04-25)


### Bug Fixes

* default value for compression field is 1 ([14c13a4](https://github.com/image-js/tiff/commit/14c13a4))



<a name="1.1.0"></a>
# [1.1.0](https://github.com/image-js/tiff/compare/v1.0.0...v1.1.0) (2015-12-04)



<a name="1.0.0"></a>
# [1.0.0](https://github.com/image-js/tiff/compare/v0.0.2...v1.0.0) (2015-11-23)



<a name="0.0.2"></a>
## [0.0.2](https://github.com/image-js/tiff/compare/v0.0.1...v0.0.2) (2015-09-20)



<a name="0.0.1"></a>
## 0.0.1 (2015-09-19)



