const {babel} = require('@rollup/plugin-babel');
const commonjs = require('@rollup/plugin-commonjs');
const nodeResolve = require('@rollup/plugin-node-resolve').nodeResolve;
const replace = require('@rollup/plugin-replace');

const NODE_ENV = process.env.NODE_ENV;
if (!NODE_ENV) {
  console.error('NODE_ENV not set');
  process.exit(1);
}

const plugins = [
  nodeResolve({
    extensions: ['.js', '.mjs'],
  }),
  commonjs({
    include: /node_modules/,
  }),
  babel({
    configFile: __dirname + '/../react-devtools-shared/babel.config.js',
    babelHelpers: 'bundled',
  }),
  replace({
    preventAssignment: true,
    values: {
      __DEV__: String(NODE_ENV === 'development'),
      __IS_CHROME__: 'false',
      __IS_FIREFOX__: 'false',
      __IS_EDGE__: 'false',
      __IS_NATIVE__: 'false',
    },
  }),
];

function createBundle(input, file) {
  return {
    input,
    // CommonJS bundles for the npm package (referenced by root stubs).
    output: {
      file,
      format: 'cjs',
      exports: 'named',
    },
    treeshake: {moduleSideEffects: false},
    plugins,
  };
}

module.exports = [
  createBundle('src/index.js', 'dist/index.js'),
  createBundle('src/register.js', 'dist/register.js'),
];
