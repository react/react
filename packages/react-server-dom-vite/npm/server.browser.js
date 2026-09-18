'use strict';

var s;
if (process.env.NODE_ENV === 'production') {
  s = require('./cjs/react-server-dom-vite-server.browser.production.js');
} else {
  s = require('./cjs/react-server-dom-vite-server.browser.development.js');
}

exports.renderToReadableStream = s.renderToReadableStream;
exports.decodeReply = s.decodeReply;
exports.decodeAction = s.decodeAction;
exports.decodeFormState = s.decodeFormState;
exports.registerClientReference = s.registerClientReference;
exports.registerServerReference = s.registerServerReference;
exports.createTemporaryReferenceSet = s.createTemporaryReferenceSet;
exports.loadServerAction = s.loadServerAction;
