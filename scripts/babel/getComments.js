/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

function getComments(path) {
  const allComments = path.hub.file.ast.comments;
  if (path.node.leadingComments) {
    // Babel AST includes comments.
    return path.node.leadingComments;
  }
  // In Hermes AST we need to find the comments by range.
  const comments = [];
  let line = path.node.loc.start.line;
  let i = allComments.length - 1;
  while (i >= 0 && allComments[i].loc.end.line >= line) {
    i--;
  }
  while (i >= 0 && allComments[i].loc.end.line === line - 1) {
    line = allComments[i].loc.start.line;
    comments.unshift(allComments[i]);
    i--;
  }
  return comments;
}

module.exports = getComments;
