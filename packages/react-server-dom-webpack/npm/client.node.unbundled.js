'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/react-server-dom-webpack-client.node.unbundled.production.js');
} else {
  module.exports = require('./cjs/react-server-dom-webpack-client.node.unbundled.development.js');
}
