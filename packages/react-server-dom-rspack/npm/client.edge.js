'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/react-server-dom-rspack-client.edge.production.js');
} else {
  module.exports = require('./cjs/react-server-dom-rspack-client.edge.development.js');
}
