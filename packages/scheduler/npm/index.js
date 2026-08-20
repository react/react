'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/scheduler.production.js');
} else {
  module.exports = require('./cjs/scheduler.development.js');
}
