'use strict';

var s;
if (process.env.NODE_ENV === 'production') {
  s = require('./cjs/react-server-dom-turbopack-server.node.production.js');
} else {
  s = require('./cjs/react-server-dom-turbopack-server.node.development.js');
}

exports.prerender = s.prerender;
exports.prerenderToNodeStream = s.prerenderToNodeStream;
