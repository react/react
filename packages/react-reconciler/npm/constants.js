'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/react-reconciler-constants.production.js');
} else {
  module.exports = require('./cjs/react-reconciler-constants.development.js');
}
