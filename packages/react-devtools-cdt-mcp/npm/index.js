'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/react-devtools-cdt-mcp.production.js');
} else {
  module.exports = require('./cjs/react-devtools-cdt-mcp.development.js');
}
