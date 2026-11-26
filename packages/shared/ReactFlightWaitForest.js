/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// A link-cut tree (Sleator and Tarjan) over a forest of nodes. A node has at
// most one parent. Finding the root of a node's tree, linking a root under
// another node, and cutting a node from its parent each take O(log n)
// amortized time.
//
// The caller decides what a parent means. In the Flight client and the reply
// decoder, the parent of a group is the group that it waits for.

// A node is any object with these three fields, which have to start out as
// null. They are the tree's own bookkeeping.
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

// `child` has to be the root of its tree.
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
