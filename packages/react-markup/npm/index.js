'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/react-markup.production.js');
} else {
  module.exports = require('./cjs/react-markup.development.js');
}
