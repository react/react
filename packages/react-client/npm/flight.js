'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/react-client-flight.production.js');
} else {
  module.exports = require('./cjs/react-client-flight.development.js');
}
