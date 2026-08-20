'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/jest-react.production.js');
} else {
  module.exports = require('./cjs/jest-react.development.js');
}
