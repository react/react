'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/react-server-flight.production.js');
} else {
  module.exports = require('./cjs/react-server-flight.development.js');
}
