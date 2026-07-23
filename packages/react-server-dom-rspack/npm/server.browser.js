'use strict';

var s;
if (process.env.NODE_ENV === 'production') {
  s = require('./cjs/react-server-dom-rspack-server.browser.production.js');
} else {
  s = require('./cjs/react-server-dom-rspack-server.browser.development.js');
}

exports.renderToReadableStream = s.renderToReadableStream;
exports.decodeReply = s.decodeReply;
exports.decodeAction = s.decodeAction;
exports.decodeFormState = s.decodeFormState;
exports.registerServerReference = s.registerServerReference;
exports.registerClientReference = s.registerClientReference;
exports.createTemporaryReferenceSet = s.createTemporaryReferenceSet;

exports.setServerActionBoundArgsEncryption =
  s.setServerActionBoundArgsEncryption;
exports.encryptServerActionBoundArgs = s.encryptServerActionBoundArgs;
exports.decryptServerActionBoundArgs = s.decryptServerActionBoundArgs;
exports.loadServerAction = s.loadServerAction;
exports.createServerEntry = s.createServerEntry;
exports.ensureServerActions = s.ensureServerActions;
