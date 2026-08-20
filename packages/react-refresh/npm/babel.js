'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/react-refresh-babel.production.js');
} else {
  module.exports = require('./cjs/react-refresh-babel.development.js');
}
