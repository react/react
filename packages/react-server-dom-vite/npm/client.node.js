'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/react-server-dom-vite-client.node.production.js');
} else {
  module.exports = require('./cjs/react-server-dom-vite-client.node.development.js');
}
