// Section 14: Differencing Predictor (p. 64)

export function applyHorizontalDifferencing(
  data: Uint8Array,
  width: number,
): void {
  let i = 0;
  while (i < data.length) {
    for (let j = 1; j < width; j++) {
      data[i + j] = (data[i + j] + data[i + j - 1]) & 255;
    }
    i += width;
  }
}

export function applyHorizontalDifferencingColor(
  data: Uint8Array,
  width: number,
): void {
  let i = 0;
  while (i < data.length) {
    for (let j = 3; j < width * 3; j += 3) {
      data[i + j] = (data[i + j] + data[i + j - 3]) & 255;
      data[i + j + 1] = (data[i + j + 1] + data[i + j - 2]) & 255;
      data[i + j + 2] = (data[i + j + 2] + data[i + j - 1]) & 255;
    }
    i += width * 3;
  }
}
