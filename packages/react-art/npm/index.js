'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/react-art.production.js');
} else {
  module.exports = require('./cjs/react-art.development.js');
}
