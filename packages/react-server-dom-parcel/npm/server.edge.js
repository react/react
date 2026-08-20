'use strict';

var s;
if (process.env.NODE_ENV === 'production') {
  s = require('./cjs/react-server-dom-parcel-server.edge.production.js');
} else {
  s = require('./cjs/react-server-dom-parcel-server.edge.development.js');
}

exports.renderToReadableStream = s.renderToReadableStream;
exports.decodeReply = s.decodeReply;
exports.decodeReplyFromAsyncIterable = s.decodeReplyFromAsyncIterable;
exports.decodeAction = s.decodeAction;
exports.decodeFormState = s.decodeFormState;
exports.createClientReference = s.createClientReference;
exports.registerServerReference = s.registerServerReference;
exports.createTemporaryReferenceSet = s.createTemporaryReferenceSet;
exports.registerServerActions = s.registerServerActions;
exports.loadServerAction = s.loadServerAction;
