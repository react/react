'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/react-server-dom-vite-client.browser.production.js');
} else {
  module.exports = require('./cjs/react-server-dom-vite-client.browser.development.js');
}
