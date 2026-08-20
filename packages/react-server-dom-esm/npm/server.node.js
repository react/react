'use strict';

var s;
if (process.env.NODE_ENV === 'production') {
  s = require('./cjs/react-server-dom-esm-server.node.production.js');
} else {
  s = require('./cjs/react-server-dom-esm-server.node.development.js');
}

exports.renderToPipeableStream = s.renderToPipeableStream;
exports.decodeReplyFromBusboy = s.decodeReplyFromBusboy;
exports.decodeReply = s.decodeReply;
exports.decodeAction = s.decodeAction;
exports.decodeFormState = s.decodeFormState;
exports.registerServerReference = s.registerServerReference;
exports.registerClientReference = s.registerClientReference;
exports.createTemporaryReferenceSet = s.createTemporaryReferenceSet;
