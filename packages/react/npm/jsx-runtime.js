'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/react-jsx-runtime.production.js');
} else {
  module.exports = require('./cjs/react-jsx-runtime.development.js');
}
