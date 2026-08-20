'use strict';

var s;
if (process.env.NODE_ENV === 'production') {
  s = require('./cjs/react-server-dom-esm-server.node.production.js');
} else {
  s = require('./cjs/react-server-dom-esm-server.node.development.js');
}

exports.prerenderToNodeStream = s.prerenderToNodeStream;
