'use strict';

var b;
var l;
if (process.env.NODE_ENV === 'production') {
  b = require('./cjs/react-dom-server.bun.production.js');
  l = require('./cjs/react-dom-server-legacy.browser.production.js');
} else {
  b = require('./cjs/react-dom-server.bun.development.js');
  l = require('./cjs/react-dom-server-legacy.browser.development.js');
}

exports.version = b.version;
exports.renderToReadableStream = b.renderToReadableStream;
exports.renderToPipeableStream = b.renderToPipeableStream;
exports.resumeToPipeableStream = b.resumeToPipeableStream;
exports.resume = b.resume;
exports.renderToString = l.renderToString;
exports.renderToStaticMarkup = l.renderToStaticMarkup;
