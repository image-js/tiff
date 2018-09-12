const rollupConfig = {
  input: 'src/index.js',
  output: {
    format: 'cjs',
    file: 'lib/index.js'
  },
  external: ['iobuffer']
};

export default rollupConfig;
