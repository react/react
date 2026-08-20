'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/react-refresh-runtime.production.js');
} else {
  module.exports = require('./cjs/react-refresh-runtime.development.js');
}
