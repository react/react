'use strict';

process.env.NODE_ENV = 'development';

module.exports = {
  setupFiles: [require.resolve('../../scripts/jest/setupEnvironment.js')],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^babel-plugin-react-compiler$':
      '<rootDir>/../../compiler/packages/babel-plugin-react-compiler/dist/index.js',
  },
};
