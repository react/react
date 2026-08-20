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
