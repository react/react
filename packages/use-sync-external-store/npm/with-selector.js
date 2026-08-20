'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/use-sync-external-store-with-selector.production.js');
} else {
  module.exports = require('./cjs/use-sync-external-store-with-selector.development.js');
}
