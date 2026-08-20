'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/react-is.production.js');
} else {
  module.exports = require('./cjs/react-is.development.js');
}
