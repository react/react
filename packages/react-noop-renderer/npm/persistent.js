'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/react-noop-renderer-persistent.production.js');
} else {
  module.exports = require('./cjs/react-noop-renderer-persistent.development.js');
}
