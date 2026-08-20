'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/react-dom-test-utils.production.js');
} else {
  module.exports = require('./cjs/react-dom-test-utils.development.js');
}
