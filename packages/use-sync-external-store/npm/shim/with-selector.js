'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('../cjs/use-sync-external-store-shim/with-selector.production.js');
} else {
  module.exports = require('../cjs/use-sync-external-store-shim/with-selector.development.js');
}
