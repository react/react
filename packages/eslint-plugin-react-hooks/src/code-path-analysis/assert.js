'use strict';

function assert(cond) {
  if (!cond) {
    throw new Error('Assertion violated.');
  }
}

module.exports = assert;
