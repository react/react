import babel from '@babel/core';

const babelOptions = {
  babelrc: false,
  ignore: [/\/(build|node_modules)\//],
  plugins: [
    '@babel/plugin-syntax-import-meta',
    ['@babel/plugin-transform-react-jsx', {runtime: 'automatic'}],
  ],
};

export async function load(url, context, defaultLoad) {
  const {format} = context;
  const result = await defaultLoad(url, context, defaultLoad);
  if (result.format === 'module') {
    const opt = Object.assign({filename: url}, babelOptions);
    const newResult = await babel.transformAsync(result.source, opt);
    if (!newResult) {
      if (typeof result.source === 'string') {
        return result;
      }
      return {
        source: Buffer.from(result.source).toString('utf8'),
        format: 'module',
      };
    }
    return {source: newResult.code, format: 'module'};
  }
  return defaultLoad(url, context, defaultLoad);
}

async function babelTransformSource(source, context, defaultTransformSource) {
  const {format} = context;
  if (format === 'module') {
    const opt = Object.assign({filename: context.url}, babelOptions);
    const newResult = await babel.transformAsync(source, opt);
    if (!newResult) {
      if (typeof source === 'string') {
        return {source};
      }
      return {
        source: Buffer.from(source).toString('utf8'),
      };
    }
    return {source: newResult.code};
  }
  return defaultTransformSource(source, context, defaultTransformSource);
}

export const transformSource =
  process.version < 'v16' ? babelTransformSource : undefined;
