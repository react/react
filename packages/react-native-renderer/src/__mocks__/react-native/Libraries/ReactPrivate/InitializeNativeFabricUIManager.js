/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

// Mock of the Native Hooks

const roots = new Map();
const allocatedTags = new Set();

function dumpSubtree(info, indent) {
  let out = '';
  out += ' '.repeat(indent) + info.viewName + ' ' + JSON.stringify(info.props);
  // eslint-disable-next-line no-for-of-loops/no-for-of-loops
  for (const child of info.children) {
    out += '\n' + dumpSubtree(child, indent + 2);
  }
  return out;
}

// document.compareDocumentPosition() bits, replicated here because this file
// runs under `@jest-environment node`, which has no DOM `Node` global.
const DOCUMENT_POSITION_DISCONNECTED = 1;
const DOCUMENT_POSITION_PRECEDING = 2;
const DOCUMENT_POSITION_FOLLOWING = 4;
const DOCUMENT_POSITION_CONTAINS = 8;
const DOCUMENT_POSITION_CONTAINED_BY = 16;
const DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC = 32;

// Fabric persists/clones nodes on nearly every commit, so a node object's
// identity (and any parent pointer we'd cache on it) goes stale almost
// immediately. Instead, walk the *live* `roots` map fresh on every query, so
// this always reflects the currently committed tree.
function computeDocumentOrder() {
  const positions = new Map();
  let order = 0;
  function visit(node, ancestorTags, rootTag) {
    positions.set(node.reactTag, {ancestorTags, order: order++, rootTag});
    const childAncestorTags = ancestorTags.concat(node.reactTag);
    // eslint-disable-next-line no-for-of-loops/no-for-of-loops
    for (const child of node.children) {
      visit(child, childAncestorTags, rootTag);
    }
  }
  // eslint-disable-next-line no-for-of-loops/no-for-of-loops
  for (const [rootTag, childSet] of roots) {
    // eslint-disable-next-line no-for-of-loops/no-for-of-loops
    for (const child of childSet) {
      visit(child, [], rootTag);
    }
  }
  return positions;
}

// Test-only stand-in for the native compareDocumentPosition method that a
// real Fabric PublicInstance exposes. Not a claim about the real native
// module's shape or naming.
function compareDocumentPositionForJestTestsOnly(reactTagA, reactTagB) {
  if (reactTagA === reactTagB) {
    return 0;
  }
  const positions = computeDocumentOrder();
  const a = positions.get(reactTagA);
  const b = positions.get(reactTagB);
  if (a === undefined || b === undefined || a.rootTag !== b.rootTag) {
    return (
      DOCUMENT_POSITION_DISCONNECTED |
      DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC |
      (reactTagA < reactTagB
        ? DOCUMENT_POSITION_FOLLOWING
        : DOCUMENT_POSITION_PRECEDING)
    );
  }
  if (b.ancestorTags.includes(reactTagA)) {
    return DOCUMENT_POSITION_CONTAINED_BY | DOCUMENT_POSITION_FOLLOWING;
  }
  if (a.ancestorTags.includes(reactTagB)) {
    return DOCUMENT_POSITION_CONTAINS | DOCUMENT_POSITION_PRECEDING;
  }
  return a.order < b.order
    ? DOCUMENT_POSITION_FOLLOWING
    : DOCUMENT_POSITION_PRECEDING;
}

// Test-only lookup so tests can splice a foreign (non-React-tracked) node
// directly into a shadow node's children, to simulate an injected native
// view. Not a real native API.
function findNodeForJestTestsOnly(reactTag) {
  function search(node) {
    if (node.reactTag === reactTag) {
      return node;
    }
    // eslint-disable-next-line no-for-of-loops/no-for-of-loops
    for (const child of node.children) {
      const found = search(child);
      if (found != null) {
        return found;
      }
    }
    return null;
  }
  // eslint-disable-next-line no-for-of-loops/no-for-of-loops
  for (const childSet of roots.values()) {
    // eslint-disable-next-line no-for-of-loops/no-for-of-loops
    for (const child of childSet) {
      const found = search(child);
      if (found != null) {
        return found;
      }
    }
  }
  return null;
}

const RCTFabricUIManager = {
  __dumpChildSetForJestTestsOnly: function (childSet) {
    const result = [];
    // eslint-disable-next-line no-for-of-loops/no-for-of-loops
    for (const child of childSet) {
      result.push(dumpSubtree(child, 0));
    }
    return result.join('\n');
  },
  __dumpHierarchyForJestTestsOnly: function () {
    const result = [];
    // eslint-disable-next-line no-for-of-loops/no-for-of-loops
    for (const [rootTag, childSet] of roots) {
      result.push(rootTag);
      // eslint-disable-next-line no-for-of-loops/no-for-of-loops
      for (const child of childSet) {
        result.push(dumpSubtree(child, 1));
      }
    }
    return result.join('\n');
  },
  createNode: jest.fn(
    function createNode(reactTag, viewName, rootTag, props, eventTarget) {
      if (allocatedTags.has(reactTag)) {
        throw new Error(`Created two native views with tag ${reactTag}`);
      }

      allocatedTags.add(reactTag);
      return {
        reactTag: reactTag,
        viewName: viewName,
        props: props,
        children: [],
      };
    },
  ),
  cloneNode: jest.fn(function cloneNode(node) {
    return {
      reactTag: node.reactTag,
      viewName: node.viewName,
      props: node.props,
      children: node.children,
    };
  }),
  cloneNodeWithNewChildren: jest.fn(
    function cloneNodeWithNewChildren(node, children) {
      return {
        reactTag: node.reactTag,
        viewName: node.viewName,
        props: node.props,
        children: children ?? [],
      };
    },
  ),
  cloneNodeWithNewProps: jest.fn(
    function cloneNodeWithNewProps(node, newPropsDiff) {
      return {
        reactTag: node.reactTag,
        viewName: node.viewName,
        props: {...node.props, ...newPropsDiff},
        children: node.children,
      };
    },
  ),
  cloneNodeWithNewChildrenAndProps: jest.fn(
    function cloneNodeWithNewChildrenAndProps(node, newPropsDiff) {
      let children = [];
      if (arguments.length === 3) {
        children = newPropsDiff;
        newPropsDiff = arguments[2];
      }

      return {
        reactTag: node.reactTag,
        viewName: node.viewName,
        props: {...node.props, ...newPropsDiff},
        children,
      };
    },
  ),
  appendChild: jest.fn(function appendChild(parentNode, childNode) {
    parentNode.children.push(childNode);
  }),

  createChildSet: jest.fn(function createChildSet() {
    return [];
  }),

  appendChildToSet: jest.fn(function appendChildToSet(childSet, childNode) {
    childSet.push(childNode);
  }),

  completeRoot: jest.fn(function completeRoot(rootTag, newChildSet) {
    roots.set(rootTag, newChildSet);
  }),

  dispatchCommand: jest.fn(),

  setNativeProps: jest.fn(),

  sendAccessibilityEvent: jest.fn(),

  registerEventHandler: jest.fn(function registerEventHandler(callback) {}),

  measure: jest.fn(function measure(node, callback) {
    if (typeof node !== 'object') {
      throw new Error(
        `Expected node to be an object, was passed "${typeof node}"`,
      );
    }

    if (typeof node.viewName !== 'string') {
      throw new Error('Expected node to be a host node.');
    }

    callback(10, 10, 100, 100, 0, 0);
  }),
  measureInWindow: jest.fn(function measureInWindow(node, callback) {
    if (typeof node !== 'object') {
      throw new Error(
        `Expected node to be an object, was passed "${typeof node}"`,
      );
    }

    if (typeof node.viewName !== 'string') {
      throw new Error('Expected node to be a host node.');
    }

    callback(10, 10, 100, 100);
  }),
  getBoundingClientRect: jest.fn(function getBoundingClientRect(node) {
    if (typeof node !== 'object') {
      throw new Error(
        `Expected node to be an object, was passed "${typeof node}"`,
      );
    }

    if (typeof node.viewName !== 'string') {
      throw new Error('Expected node to be a host node.');
    }

    return [10, 10, 100, 100];
  }),
  measureLayout: jest.fn(
    function measureLayout(node, relativeNode, fail, success) {
      if (typeof node !== 'object') {
        throw new Error(
          `Expected node to be an object, was passed "${typeof node}"`,
        );
      }

      if (typeof node.viewName !== 'string') {
        throw new Error('Expected node to be a host node.');
      }

      if (typeof relativeNode !== 'object') {
        throw new Error(
          `Expected relative node to be an object, was passed "${typeof relativeNode}"`,
        );
      }

      if (typeof relativeNode.viewName !== 'string') {
        throw new Error('Expected relative node to be a host node.');
      }

      success(1, 1, 100, 100);
    },
  ),
  setIsJSResponder: jest.fn(),

  compareDocumentPositionForJestTestsOnly: jest.fn(
    compareDocumentPositionForJestTestsOnly,
  ),
  findNodeForJestTestsOnly: jest.fn(findNodeForJestTestsOnly),
};

global.nativeFabricUIManager = RCTFabricUIManager;

// DOMRect isn't provided by jsdom, but it's used by `ReactFabricHostComponent`.
// This is a basic implementation for testing.
global.DOMRect = class DOMRect {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  toJSON() {
    const {x, y, width, height} = this;
    return {x, y, width, height};
  }
};
