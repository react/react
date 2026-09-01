'use strict';

var s;
if (process.env.NODE_ENV === 'production') {
  s = require('./cjs/react-server-dom-webpack-server.node.unbundled.production.js');
} else {
  s = require('./cjs/react-server-dom-webpack-server.node.unbundled.development.js');
}

exports.prerenderToNodeStream = s.prerenderToNodeStream;
