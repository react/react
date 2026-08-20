'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/react-dom.react-server.production.js');
} else {
  module.exports = require('./cjs/react-dom.react-server.development.js');
}
