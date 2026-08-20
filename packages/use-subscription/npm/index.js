'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/use-subscription.production.js');
} else {
  module.exports = require('./cjs/use-subscription.development.js');
}
