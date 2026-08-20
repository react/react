'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/react.react-server.production.js');
} else {
  module.exports = require('./cjs/react.react-server.development.js');
}
