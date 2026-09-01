/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber} from 'react-reconciler/src/ReactInternalTypes';
import type {Instance} from './ReactFiberConfig';

import {
  HostComponent,
  HostHoistable,
  HostSingleton,
  HostText,
} from 'react-reconciler/src/ReactWorkTags';
import getComponentNameFromType from 'shared/getComponentNameFromType';
import {
  findFiberRoot,
  getBoundingRect,
  getInstanceFromNode,
  getTextContent,
  isHiddenSubtree,
  matchAccessibilityRole,
  setFocusIfFocusable,
  setupIntersectionObserver,
  supportsTestSelectors,
} from './ReactFiberConfig';

let COMPONENT_TYPE: symbol | number = 0b000;
let HAS_PSEUDO_CLASS_TYPE: symbol | number = 0b001;
let ROLE_TYPE: symbol | number = 0b010;
let TEST_NAME_TYPE: symbol | number = 0b011;
let TEXT_TYPE: symbol | number = 0b100;

if (typeof Symbol === 'function' && Symbol.for) {
  const symbolFor = Symbol.for;
  COMPONENT_TYPE = symbolFor('selector.component');
  HAS_PSEUDO_CLASS_TYPE = symbolFor('selector.has_pseudo_class');
  ROLE_TYPE = symbolFor('selector.role');
  TEST_NAME_TYPE = symbolFor('selector.test_id');
  TEXT_TYPE = symbolFor('selector.text');
}

type Type = symbol | number;

type ComponentSelector = {
  $$typeof: Type,
  value: component(),
};

type HasPseudoClassSelector = {
  $$typeof: Type,
  value: Array<Selector>,
};

type RoleSelector = {
  $$typeof: Type,
  value: string,
};

type TextSelector = {
  $$typeof: Type,
  value: string,
};

type TestNameSelector = {
  $$typeof: Type,
  value: string,
};

type Selector =
  | ComponentSelector
  | HasPseudoClassSelector
  | RoleSelector
  | TextSelector
  | TestNameSelector;

export function createComponentSelector(
  component: component(),
): ComponentSelector {
  return {
    $$typeof: COMPONENT_TYPE,
    value: component,
  };
}

export function createHasPseudoClassSelector(
  selectors: Array<Selector>,
): HasPseudoClassSelector {
  return {
    $$typeof: HAS_PSEUDO_CLASS_TYPE,
    value: selectors,
  };
}

export function createRoleSelector(role: string): RoleSelector {
  return {
    $$typeof: ROLE_TYPE,
    value: role,
  };
}

export function createTextSelector(text: string): TextSelector {
  return {
    $$typeof: TEXT_TYPE,
    value: text,
  };
}

export function createTestNameSelector(id: string): TestNameSelector {
  return {
    $$typeof: TEST_NAME_TYPE,
    value: id,
  };
}

function findFiberRootForHostRoot(hostRoot: Instance): Fiber {
  const maybeFiber = getInstanceFromNode(hostRoot as any);
  if (maybeFiber != null) {
    if (typeof maybeFiber.memoizedProps['data-testname'] !== 'string') {
      throw new Error(
        'Invalid host root specified. Should be either a React container or a node with a testname attribute.',
      );
    }

    return maybeFiber as any as Fiber;
  } else {
    const fiberRoot = findFiberRoot(hostRoot);

    // $FlowFixMe[invalid-compare]
    if (fiberRoot === null) {
      throw new Error(
        'Could not find React container within specified host subtree.',
      );
    }

    // The Flow type for FiberRoot is a little funky.
    // createFiberRoot() cheats this by treating the root as :any and adding stateNode lazily.
    return (fiberRoot as any).stateNode.current as Fiber;
  }
}

function matchSelector(fiber: Fiber, selector: Selector): boolean {
  const tag = fiber.tag;
  switch (selector.$$typeof) {
    case COMPONENT_TYPE:
      if (fiber.type === selector.value) {
        return true;
      }
      break;
    case HAS_PSEUDO_CLASS_TYPE:
      return hasMatchingPaths(
        fiber,
        (selector as any as HasPseudoClassSelector).value,
      );
    case ROLE_TYPE:
      if (
        tag === HostComponent ||
        tag === HostHoistable ||
        tag === HostSingleton
      ) {
        const node = fiber.stateNode;
        if (
          matchAccessibilityRole(node, (selector as any as RoleSelector).value)
        ) {
          return true;
        }
      }
      break;
    case TEXT_TYPE:
      if (
        tag === HostComponent ||
        tag === HostText ||
        tag === HostHoistable ||
        tag === HostSingleton
      ) {
        const textContent = getTextContent(fiber);
        // $FlowFixMe[invalid-compare]
        if (
          // $FlowFixMe[invalid-compare]
          textContent !== null &&
          textContent.indexOf((selector as any as TextSelector).value) >= 0
        ) {
          return true;
        }
      }
      break;
    case TEST_NAME_TYPE:
      if (
        tag === HostComponent ||
        tag === HostHoistable ||
        tag === HostSingleton
      ) {
        const dataTestID = fiber.memoizedProps['data-testname'];
        if (
          typeof dataTestID === 'string' &&
          dataTestID.toLowerCase() ===
            (selector as any as TestNameSelector).value.toLowerCase()
        ) {
          return true;
        }
      }
      break;
    default:
      throw new Error('Invalid selector type specified.');
  }

  return false;
}

function selectorToString(selector: Selector): string | null {
  switch (selector.$$typeof) {
    case COMPONENT_TYPE:
      const displayName = getComponentNameFromType(selector.value) || 'Unknown';
      return `<${displayName}>`;
    case HAS_PSEUDO_CLASS_TYPE:
      return `:has(${selectorToString(selector) || ''})`;
    case ROLE_TYPE:
      return `[role="${(selector as any as RoleSelector).value}"]`;
    case TEXT_TYPE:
      return `"${(selector as any as TextSelector).value}"`;
    case TEST_NAME_TYPE:
      return `[data-testname="${(selector as any as TestNameSelector).value}"]`;
    default:
      throw new Error('Invalid selector type specified.');
  }
}

function findPaths(root: Fiber, selectors: Array<Selector>): Array<Fiber> {
  const matchingFibers: Array<Fiber> = [];

  const stack = [root, 0];
  let index = 0;
  while (index < stack.length) {
    const fiber = stack[index++] as any as Fiber;
    const tag = fiber.tag;
    let selectorIndex = stack[index++] as any as number;
    let selector = selectors[selectorIndex];

    if (
      (tag === HostComponent ||
        tag === HostHoistable ||
        tag === HostSingleton) &&
      isHiddenSubtree(fiber)
    ) {
      continue;
    } else {
      while (selector != null && matchSelector(fiber, selector)) {
        selectorIndex++;
        selector = selectors[selectorIndex];
      }
    }

    if (selectorIndex === selectors.length) {
      matchingFibers.push(fiber);
    } else {
      let child = fiber.child;
      while (child !== null) {
        stack.push(child, selectorIndex);
        child = child.sibling;
      }
    }
  }

  return matchingFibers;
}

// Same as findPaths but with eager bailout on first match
function hasMatchingPaths(root: Fiber, selectors: Array<Selector>): boolean {
  const stack = [root, 0];
  let index = 0;
  while (index < stack.length) {
    const fiber = stack[index++] as any as Fiber;
    const tag = fiber.tag;
    let selectorIndex = stack[index++] as any as number;
    let selector = selectors[selectorIndex];

    if (
      (tag === HostComponent ||
        tag === HostHoistable ||
        tag === HostSingleton) &&
      isHiddenSubtree(fiber)
    ) {
      continue;
    } else {
      while (selector != null && matchSelector(fiber, selector)) {
        selectorIndex++;
        selector = selectors[selectorIndex];
      }
    }

    if (selectorIndex === selectors.length) {
      return true;
    } else {
      let child = fiber.child;
      while (child !== null) {
        stack.push(child, selectorIndex);
        child = child.sibling;
      }
    }
  }

  return false;
}

export function findAllNodes(
  hostRoot: Instance,
  selectors: Array<Selector>,
): Array<Instance> {
  // $FlowFixMe[constant-condition]
  if (!supportsTestSelectors) {
    throw new Error('Test selector API is not supported by this renderer.');
  }

  const root = findFiberRootForHostRoot(hostRoot);
  const matchingFibers = findPaths(root, selectors);

  const instanceRoots: Array<Instance> = [];

  const stack = Array.from(matchingFibers);
  let index = 0;
  while (index < stack.length) {
    const node = stack[index++] as any as Fiber;
    const tag = node.tag;
    if (
      tag === HostComponent ||
      tag === HostHoistable ||
      tag === HostSingleton
    ) {
      if (isHiddenSubtree(node)) {
        continue;
      }
      instanceRoots.push(node.stateNode);
    } else {
      let child = node.child;
      while (child !== null) {
        stack.push(child);
        child = child.sibling;
      }
    }
  }

  return instanceRoots;
}

export function getFindAllNodesFailureDescription(
  hostRoot: Instance,
  selectors: Array<Selector>,
): string | null {
  // $FlowFixMe[constant-condition]
  if (!supportsTestSelectors) {
    throw new Error('Test selector API is not supported by this renderer.');
  }

  const root = findFiberRootForHostRoot(hostRoot);

  let maxSelectorIndex: number = 0;
  const matchedNames = [];

  // The logic of this loop should be kept in sync with findPaths()
  const stack = [root, 0];
  let index = 0;
  while (index < stack.length) {
    const fiber = stack[index++] as any as Fiber;
    const tag = fiber.tag;
    let selectorIndex = stack[index++] as any as number;
    const selector = selectors[selectorIndex];

    if (
      (tag === HostComponent ||
        tag === HostHoistable ||
        tag === HostSingleton) &&
      isHiddenSubtree(fiber)
    ) {
      continue;
    } else if (matchSelector(fiber, selector)) {
      matchedNames.push(selectorToString(selector));
      selectorIndex++;

      if (selectorIndex > maxSelectorIndex) {
        maxSelectorIndex = selectorIndex;
      }
    }

    if (selectorIndex < selectors.length) {
      let child = fiber.child;
      while (child !== null) {
        stack.push(child, selectorIndex);
        child = child.sibling;
      }
    }
  }

  if (maxSelectorIndex < selectors.length) {
    const unmatchedNames = [];
    for (let i = maxSelectorIndex; i < selectors.length; i++) {
      unmatchedNames.push(selectorToString(selectors[i]));
    }

    return (
      'findAllNodes was able to match part of the selector:\n' +
      `  ${matchedNames.join(' > ')}\n\n` +
      'No matching component was found for:\n' +
      `  ${unmatchedNames.join(' > ')}`
    );
  }

  return null;
}

export type BoundingRect = {
  x: number,
  y: number,
  width: number,
  height: number,
};

export function findBoundingRects(
  hostRoot: Instance,
  selectors: Array<Selector>,
): Array<BoundingRect> {
  // $FlowFixMe[constant-condition]
  if (!supportsTestSelectors) {
    throw new Error('Test selector API is not supported by this renderer.');
  }

  const instanceRoots = findAllNodes(hostRoot, selectors);

  const boundingRects: Array<BoundingRect> = [];
  for (let i = 0; i < instanceRoots.length; i++) {
    boundingRects.push(getBoundingRect(instanceRoots[i]));
  }

  for (let i = boundingRects.length - 1; i > 0; i--) {
    const targetRect = boundingRects[i];
    const targetLeft = targetRect.x;
    const targetRight = targetLeft + targetRect.width;
    const targetTop = targetRect.y;
    const targetBottom = targetTop + targetRect.height;

    for (let j = i - 1; j >= 0; j--) {
      if (i !== j) {
        const otherRect = boundingRects[j];
        const otherLeft = otherRect.x;
        const otherRight = otherLeft + otherRect.width;
        const otherTop = otherRect.y;
        const otherBottom = otherTop + otherRect.height;

        // Merging all rects to the minimums set would be complicated,
        // but we can handle the most common cases:
        // 1. completely overlapping rects
        // 2. adjacent rects that are the same width or height (e.g. items in a list)
        //
        // Even given the above constraints,
        // we still won't end up with the fewest possible rects without doing multiple passes,
        // but it's good enough for this purpose.

        if (
          targetLeft >= otherLeft &&
          targetTop >= otherTop &&
          targetRight <= otherRight &&
          targetBottom <= otherBottom
        ) {
          // Complete overlapping rects; remove the inner one.
          boundingRects.splice(i, 1);
          break;
        } else if (
          targetLeft === otherLeft &&
          targetRect.width === otherRect.width &&
          !(otherBottom < targetTop) &&
          !(otherTop > targetBottom)
        ) {
          // Adjacent vertical rects; merge them.
          if (otherTop > targetTop) {
            otherRect.height += otherTop - targetTop;
            otherRect.y = targetTop;
          }
          if (otherBottom < targetBottom) {
            otherRect.height = targetBottom - otherTop;
          }

          boundingRects.splice(i, 1);
          break;
        } else if (
          targetTop === otherTop &&
          targetRect.height === otherRect.height &&
          !(otherRight < targetLeft) &&
          !(otherLeft > targetRight)
        ) {
          // Adjacent horizontal rects; merge them.
          if (otherLeft > targetLeft) {
            otherRect.width += otherLeft - targetLeft;
            otherRect.x = targetLeft;
          }
          if (otherRight < targetRight) {
            otherRect.width = targetRight - otherLeft;
          }

          boundingRects.splice(i, 1);
          break;
        }
      }
    }
  }

  return boundingRects;
}

export function focusWithin(
  hostRoot: Instance,
  selectors: Array<Selector>,
): boolean {
  // $FlowFixMe[constant-condition]
  if (!supportsTestSelectors) {
    throw new Error('Test selector API is not supported by this renderer.');
  }

  const root = findFiberRootForHostRoot(hostRoot);
  const matchingFibers = findPaths(root, selectors);

  const stack = Array.from(matchingFibers);
  let index = 0;
  while (index < stack.length) {
    const fiber = stack[index++] as any as Fiber;
    const tag = fiber.tag;
    if (isHiddenSubtree(fiber)) {
      continue;
    }
    if (
      tag === HostComponent ||
      tag === HostHoistable ||
      tag === HostSingleton
    ) {
      const node = fiber.stateNode;
      if (setFocusIfFocusable(node)) {
        return true;
      }
    }
    let child = fiber.child;
    while (child !== null) {
      stack.push(child);
      child = child.sibling;
    }
  }

  return false;
}

const commitHooks: Array<Function> = [];

export function onCommitRoot(): void {
  // $FlowFixMe[constant-condition]
  if (supportsTestSelectors) {
    commitHooks.forEach(commitHook => commitHook());
  }
}

export type IntersectionObserverOptions = Object;

export type ObserveVisibleRectsCallback = (
  intersections: Array<{ratio: number, rect: BoundingRect}>,
) => void;

export function observeVisibleRects(
  hostRoot: Instance,
  selectors: Array<Selector>,
  callback: (intersections: Array<{ratio: number, rect: BoundingRect}>) => void,
  options?: IntersectionObserverOptions,
): {disconnect: () => void} {
  // $FlowFixMe[constant-condition]
  if (!supportsTestSelectors) {
    throw new Error('Test selector API is not supported by this renderer.');
  }

  const instanceRoots = findAllNodes(hostRoot, selectors);

  const {disconnect, observe, unobserve} = setupIntersectionObserver(
    instanceRoots,
    callback,
    options,
  );

  // When React mutates the host environment, we may need to change what we're listening to.
  const commitHook = () => {
    const nextInstanceRoots = findAllNodes(hostRoot, selectors);

    instanceRoots.forEach(target => {
      if (nextInstanceRoots.indexOf(target) < 0) {
        unobserve(target);
      }
    });

    nextInstanceRoots.forEach(target => {
      if (instanceRoots.indexOf(target) < 0) {
        observe(target);
      }
    });
  };

  commitHooks.push(commitHook);

  return {
    disconnect: () => {
      // Stop listening for React mutations:
      const index = commitHooks.indexOf(commitHook);
      if (index >= 0) {
        commitHooks.splice(index, 1);
      }

      // Disconnect the host observer:
      disconnect();
    },
  };
}
