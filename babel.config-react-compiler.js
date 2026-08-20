'use strict';

/**
 * HACK: @poteto React Compiler inlines Zod in its build artifact. Zod spreads values passed to .map
 * which causes issues in @babel/plugin-transform-spread in loose mode, as it will result in
 * {undefined: undefined} which fails to parse.
 *
 * [@babel/plugin-transform-block-scoping', {throwIfClosureRequired: true}] also causes issues with
 * the built version of the compiler. The minimal set of plugins needed for this file is reexported
 * from babel.config-ts.
 *
 * I will remove this hack later when we move eslint-plugin-react-hooks into the compiler directory.
 **/

const baseConfig = require('./babel.config-ts');

module.exports = {
  plugins: baseConfig.plugins,
};
