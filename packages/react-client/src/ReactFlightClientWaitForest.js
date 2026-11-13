/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// A link-cut tree (Sleator and Tarjan) over a forest of nodes. Each node's
// parent is kept in `pathParent`; `pathLeft` and `pathRight` are the splay-tree
// children of the preferred path the node lies on. A node links only when it
// is the root of its tree, so the structure stays a forest. There is no evert
// and no path aggregate, so the operations needed are link, cut and finding a
// node's root, each O(log n) amortized.
//
// The caller keeps the domain meaning of a parent (for the reader, the cycle a
// wait leads into) and only uses these to record it and find a root. A node is
// any object with the three fields below; the fields must start null.

// A node of the forest. A caller's node type carries more fields; those are
// irrelevant here. The three fields must start null.
export type WaitForestNode = {
  pathParent: null | WaitForestNode,
  pathLeft: null | WaitForestNode,
  pathRight: null | WaitForestNode,
  ...
};

function isPathRoot(x: WaitForestNode): boolean {
  const parent = x.pathParent;
  return parent === null || (parent.pathLeft !== x && parent.pathRight !== x);
}

function rotatePath(x: WaitForestNode): void {
  const parent: WaitForestNode = x.pathParent as any;
  const grandparent = parent.pathParent;
  if (!isPathRoot(parent)) {
    const g: WaitForestNode = grandparent as any;
    if (g.pathLeft === parent) {
      g.pathLeft = x;
    } else {
      g.pathRight = x;
    }
  }
  x.pathParent = grandparent;
  if (parent.pathLeft === x) {
    parent.pathLeft = x.pathRight;
    if (x.pathRight !== null) {
      x.pathRight.pathParent = parent;
    }
    x.pathRight = parent;
  } else {
    parent.pathRight = x.pathLeft;
    if (x.pathLeft !== null) {
      x.pathLeft.pathParent = parent;
    }
    x.pathLeft = parent;
  }
  parent.pathParent = x;
}

function splayPath(x: WaitForestNode): void {
  while (!isPathRoot(x)) {
    const parent: WaitForestNode = x.pathParent as any;
    if (!isPathRoot(parent)) {
      const grandparent: WaitForestNode = parent.pathParent as any;
      if ((grandparent.pathLeft === parent) === (parent.pathLeft === x)) {
        rotatePath(parent);
      } else {
        rotatePath(x);
      }
    }
    rotatePath(x);
  }
}

// Makes the path from the root of x's tree to x one splay tree, with x at its
// top and nothing below x on it.
function accessPath(x: WaitForestNode): void {
  let last: null | WaitForestNode = null;
  for (let y: null | WaitForestNode = x; y !== null; y = y.pathParent) {
    splayPath(y);
    y.pathRight = last;
    last = y;
  }
  splayPath(x);
}

export function findWaitRoot(x: WaitForestNode): WaitForestNode {
  accessPath(x);
  let root = x;
  while (root.pathLeft !== null) {
    root = root.pathLeft;
  }
  splayPath(root);
  return root;
}

// `child` is the root of its tree.
export function linkWait(child: WaitForestNode, parent: WaitForestNode): void {
  accessPath(child);
  child.pathParent = parent;
}

export function cutWait(child: WaitForestNode): void {
  accessPath(child);
  const above = child.pathLeft;
  if (above !== null) {
    above.pathParent = null;
    child.pathLeft = null;
  }
}
