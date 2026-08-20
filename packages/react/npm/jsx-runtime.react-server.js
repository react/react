'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/react-jsx-runtime.react-server.production.js');
} else {
  module.exports = require('./cjs/react-jsx-runtime.react-server.development.js');
}
