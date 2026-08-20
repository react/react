'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/react-jsx-dev-runtime.react-server.production.js');
} else {
  module.exports = require('./cjs/react-jsx-dev-runtime.react-server.development.js');
}
