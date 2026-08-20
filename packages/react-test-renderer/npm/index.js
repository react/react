'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/react-test-renderer.production.js');
} else {
  module.exports = require('./cjs/react-test-renderer.development.js');
}
