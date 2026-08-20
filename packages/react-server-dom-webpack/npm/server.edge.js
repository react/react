'use strict';

var s;
if (process.env.NODE_ENV === 'production') {
  s = require('./cjs/react-server-dom-webpack-server.edge.production.js');
} else {
  s = require('./cjs/react-server-dom-webpack-server.edge.development.js');
}

exports.renderToReadableStream = s.renderToReadableStream;
exports.decodeReply = s.decodeReply;
exports.decodeReplyFromAsyncIterable = s.decodeReplyFromAsyncIterable;
exports.decodeAction = s.decodeAction;
exports.decodeFormState = s.decodeFormState;
exports.registerServerReference = s.registerServerReference;
exports.registerClientReference = s.registerClientReference;
exports.createClientModuleProxy = s.createClientModuleProxy;
exports.createTemporaryReferenceSet = s.createTemporaryReferenceSet;
