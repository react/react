/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber} from './ReactInternalTypes';
import type {
  Instance,
  TextInstance,
  HydratableInstance,
  ActivityInstance,
  SuspenseInstance,
  Container,
  HostContext,
} from './ReactFiberConfig';
import type {ActivityState} from './ReactFiberActivityComponent';
import type {SuspenseState} from './ReactFiberSuspenseComponent';
import type {TreeContext} from './ReactFiberTreeContext';
import type {CapturedValue} from './ReactCapturedValue';
import type {HydrationDiffNode} from './ReactFiberHydrationDiffs';

import {
  HostComponent,
  HostSingleton,
  HostRoot,
  SuspenseComponent,
  ActivityComponent,
} from './ReactWorkTags';

import {createCapturedValueAtFiber} from './ReactCapturedValue';

import {createFiberFromDehydratedFragment} from './ReactFiber';
import {
  shouldSetTextContent,
  supportsHydration,
  supportsSingletons,
  getNextHydratableSibling,
  getNextHydratableSiblingAfterSingleton,
  getFirstHydratableChild,
  getFirstHydratableChildWithinContainer,
  getFirstHydratableChildWithinActivityInstance,
  getFirstHydratableChildWithinSuspenseInstance,
  getFirstHydratableChildWithinSingleton,
  hydrateInstance,
  diffHydratedPropsForDevWarnings,
  describeHydratableInstanceForDevWarnings,
  hydrateTextInstance,
  diffHydratedTextForDevWarnings,
  hydrateActivityInstance,
  hydrateSuspenseInstance,
  getNextHydratableInstanceAfterActivityInstance,
  getNextHydratableInstanceAfterSuspenseInstance,
  shouldDeleteUnhydratedTailInstances,
  resolveSingletonInstance,
  canHydrateInstance,
  canHydrateTextInstance,
  canHydrateActivityInstance,
  canHydrateSuspenseInstance,
  canHydrateFormStateMarker,
  isFormStateMarkerMatching,
  validateHydratableInstance,
  validateHydratableTextInstance,
} from './ReactFiberConfig';
import {OffscreenLane} from './ReactFiberLane';
import {
  getSuspendedTreeContext,
  restoreSuspendedTreeContext,
} from './ReactFiberTreeContext';
import {queueRecoverableErrors} from './ReactFiberWorkLoop';
import {getRootHostContainer, getHostContext} from './ReactFiberHostContext';
import {describeDiff} from './ReactFiberHydrationDiffs';
import {runWithFiberInDEV} from './ReactCurrentFiber';
import getComponentNameFromFiber from './getComponentNameFromFiber';

// The deepest Fiber on the stack involved in a hydration context.
// This may have been an insertion or a hydration.
let hydrationParentFiber: null | Fiber = null;
let nextHydratableInstance: null | HydratableInstance = null;
let isHydrating: boolean = false;

// This flag allows for warning supression when we expect there to be mismatches
// due to earlier mismatches or a suspended fiber.
let didSuspendOrErrorDEV: boolean = false;

// Hydration differences found that haven't yet been logged.
let hydrationDiffRootDEV: null | HydrationDiffNode = null;

// Hydration errors that were thrown inside this boundary
let hydrationErrors: Array<CapturedValue<mixed>> | null = null;

let rootOrSingletonContext = false;

// Builds a common ancestor tree from the root down for collecting diffs.
function buildHydrationDiffNode(
  fiber: Fiber,
  distanceFromLeaf: number,
): HydrationDiffNode {
  if (fiber.return === null) {
    // We're at the root.
    if (hydrationDiffRootDEV === null) {
      hydrationDiffRootDEV = {
        fiber: fiber,
        children: [],
        serverProps: undefined,
        serverTail: [],
        distanceFromLeaf: distanceFromLeaf,
      };
    } else if (hydrationDiffRootDEV.fiber !== fiber) {
      throw new Error(
        'Saw multiple hydration diff roots in a pass. This is a bug in React.',
      );
    } else if (hydrationDiffRootDEV.distanceFromLeaf > distanceFromLeaf) {
      hydrationDiffRootDEV.distanceFromLeaf = distanceFromLeaf;
    }
    return hydrationDiffRootDEV;
  }
  const siblings = buildHydrationDiffNode(
    fiber.return,
    distanceFromLeaf + 1,
  ).children;
  // The same node may already exist in the parent. Since we currently always render depth first
  // and rerender if we suspend or terminate early, if a shared ancestor was added we should still
  // be inside of that shared ancestor which means it was the last one to be added. If this changes
  // we may have to scan the whole set.
  if (siblings.length > 0 && siblings[siblings.length - 1].fiber === fiber) {
    const existing = siblings[siblings.length - 1];
    if (existing.distanceFromLeaf > distanceFromLeaf) {
      existing.distanceFromLeaf = distanceFromLeaf;
    }
    return existing;
  }
  const newNode: HydrationDiffNode = {
    fiber: fiber,
    children: [],
    serverProps: undefined,
    serverTail: [],
    distanceFromLeaf: distanceFromLeaf,
  };
  siblings.push(newNode);
  return newNode;
}

function warnIfHydrating() {
  if (__DEV__) {
    if (isHydrating) {
      console.error(
        'We should not be hydrating here. This is a bug in React. Please file a bug.',
      );
    }
  }
}

export function markDidThrowWhileHydratingDEV() {
  if (__DEV__) {
    didSuspendOrErrorDEV = true;
  }
}

function enterHydrationState(fiber: Fiber): boolean {
  // $FlowFixMe[constant-condition]
  if (!supportsHydration) {
    return false;
  }

  const parentInstance: Container = fiber.stateNode.containerInfo;
  nextHydratableInstance =
    getFirstHydratableChildWithinContainer(parentInstance);
  hydrationParentFiber = fiber;
  isHydrating = true;
  hydrationErrors = null;
  didSuspendOrErrorDEV = false;
  hydrationDiffRootDEV = null;
  rootOrSingletonContext = true;

  return true;
}

function reenterHydrationStateFromDehydratedActivityInstance(
  fiber: Fiber,
  activityInstance: ActivityInstance,
  treeContext: TreeContext | null,
): boolean {
  // $FlowFixMe[constant-condition]
  if (!supportsHydration) {
    return false;
  }
  nextHydratableInstance =
    getFirstHydratableChildWithinActivityInstance(activityInstance);
  hydrationParentFiber = fiber;
  isHydrating = true;
  hydrationErrors = null;
  didSuspendOrErrorDEV = false;
  hydrationDiffRootDEV = null;
  rootOrSingletonContext = false;
  if (treeContext !== null) {
    restoreSuspendedTreeContext(fiber, treeContext);
  }
  return true;
}

function reenterHydrationStateFromDehydratedSuspenseInstance(
  fiber: Fiber,
  suspenseInstance: SuspenseInstance,
  treeContext: TreeContext | null,
): boolean {
  // $FlowFixMe[constant-condition]
  if (!supportsHydration) {
    return false;
  }
  nextHydratableInstance =
    getFirstHydratableChildWithinSuspenseInstance(suspenseInstance);
  hydrationParentFiber = fiber;
  isHydrating = true;
  hydrationErrors = null;
  didSuspendOrErrorDEV = false;
  hydrationDiffRootDEV = null;
  rootOrSingletonContext = false;
  if (treeContext !== null) {
    restoreSuspendedTreeContext(fiber, treeContext);
  }
  return true;
}

function warnNonHydratedInstance(
  fiber: Fiber,
  rejectedCandidate: null | HydratableInstance,
) {
  if (__DEV__) {
    if (didSuspendOrErrorDEV) {
      // Inside a boundary that already suspended. We're currently rendering the
      // siblings of a suspended node. The mismatch may be due to the missing
      // data, so it's probably a false positive.
      return;
    }

    // Add this fiber to the diff tree.
    const diffNode = buildHydrationDiffNode(fiber, 0);
    // We use null as a signal that there was no node to match.
    diffNode.serverProps = null;
    if (rejectedCandidate !== null) {
      const description =
        describeHydratableInstanceForDevWarnings(rejectedCandidate);
      diffNode.serverTail.push(description);
    }
  }
}

function tryHydrateInstance(
  fiber: Fiber,
  nextInstance: any,
  hostContext: HostContext,
) {
  // fiber is a HostComponent Fiber
  const instance = canHydrateInstance(
    nextInstance,
    fiber.type,
    fiber.pendingProps,
    rootOrSingletonContext,
  );
  // $FlowFixMe[invalid-compare]
  // $FlowFixMe[invalid-compare]
  if (instance !== null) {
    fiber.stateNode = instance as Instance;

    if (__DEV__) {
      if (!didSuspendOrErrorDEV) {
        const differences = diffHydratedPropsForDevWarnings(
          instance,
          fiber.type,
          fiber.pendingProps,
          hostContext,
          // $FlowFixMe[invalid-compare]
        );
        // $FlowFixMe[invalid-compare]
        if (differences !== null) {
          const diffNode = buildHydrationDiffNode(fiber, 0);
          diffNode.serverProps = differences;
        }
      }
    }

    hydrationParentFiber = fiber;
    nextHydratableInstance = getFirstHydratableChild(instance);
    rootOrSingletonContext = false;
    return true;
  }
  return false;
}

function tryHydrateText(fiber: Fiber, nextInstance: any) {
  // fiber is a HostText Fiber
  const text = fiber.pendingProps;
  const textInstance = canHydrateTextInstance(
    nextInstance,
    text,
    // $FlowFixMe[invalid-compare]
    rootOrSingletonContext,
  );
  // $FlowFixMe[invalid-compare]
  if (textInstance !== null) {
    fiber.stateNode = textInstance as TextInstance;
    hydrationParentFiber = fiber;
    // Text Instances don't have children so there's nothing to hydrate.
    nextHydratableInstance = null;
    return true;
  }
  return false;
}

function tryHydrateActivity(
  fiber: Fiber,
  nextInstance: any,
): null | ActivityInstance {
  // fiber is a ActivityComponent Fiber
  const activityInstance = canHydrateActivityInstance(
    // $FlowFixMe[invalid-compare]
    nextInstance,
    rootOrSingletonContext,
  );
  // $FlowFixMe[invalid-compare]
  if (activityInstance !== null) {
    const activityState: ActivityState = {
      dehydrated: activityInstance,
      treeContext: getSuspendedTreeContext(),
      retryLane: OffscreenLane,
      hydrationErrors: null,
    };
    fiber.memoizedState = activityState;
    // Store the dehydrated fragment as a child fiber.
    // This simplifies the code for getHostSibling and deleting nodes,
    // since it doesn't have to consider all Suspense boundaries and
    // check if they're dehydrated ones or not.
    const dehydratedFragment =
      createFiberFromDehydratedFragment(activityInstance);
    dehydratedFragment.return = fiber;
    fiber.child = dehydratedFragment;
    hydrationParentFiber = fiber;
    // While an Activity Instance does have children, we won't step into
    // it during the first pass. Instead, we'll reenter it later.
    nextHydratableInstance = null;
  }
  return activityInstance;
}

function tryHydrateSuspense(
  fiber: Fiber,
  nextInstance: any,
): null | SuspenseInstance {
  // fiber is a SuspenseComponent Fiber
  // $FlowFixMe[invalid-compare]
  const suspenseInstance = canHydrateSuspenseInstance(
    nextInstance,
    rootOrSingletonContext,
  );
  // $FlowFixMe[invalid-compare]
  if (suspenseInstance !== null) {
    const suspenseState: SuspenseState = {
      dehydrated: suspenseInstance,
      treeContext: getSuspendedTreeContext(),
      retryLane: OffscreenLane,
      hydrationErrors: null,
    };
    fiber.memoizedState = suspenseState;
    // Store the dehydrated fragment as a child fiber.
    // This simplifies the code for getHostSibling and deleting nodes,
    // since it doesn't have to consider all Suspense boundaries and
    // check if they're dehydrated ones or not.
    const dehydratedFragment =
      createFiberFromDehydratedFragment(suspenseInstance);
    dehydratedFragment.return = fiber;
    fiber.child = dehydratedFragment;
    hydrationParentFiber = fiber;
    // While a Suspense Instance does have children, we won't step into
    // it during the first pass. Instead, we'll reenter it later.
    nextHydratableInstance = null;
  }
  return suspenseInstance;
}

export const HydrationMismatchException: mixed = new Error(
  'Hydration Mismatch Exception: This is not a real error, and should not leak into ' +
    "userspace. If you're seeing this, it's likely a bug in React.",
);

function throwOnHydrationMismatch(fiber: Fiber, fromText: boolean = false) {
  let diff = '';
  if (__DEV__) {
    // Consume the diff root for this mismatch.
    // Any other errors will get their own diffs.
    const diffRoot = hydrationDiffRootDEV;
    if (diffRoot !== null) {
      hydrationDiffRootDEV = null;
      diff = describeDiff(diffRoot);
    }
  }

  // Get component name for better context
  const componentName = getComponentNameFromFiber(fiber);
  const componentContext = componentName ? ` in <${componentName}>` : '';

  // Determine mismatch type for more specific guidance
  const mismatchType = fromText ? 'text' : 'HTML';
  const specificGuidance = fromText
    ? '\n- Text content differs (check Date.now(), Math.random(), locale-specific formatting)'
    : '\n- HTML structure differs (check tag nesting, element attributes)';

  const error = new Error(
    `Hydration mismatch: The server rendered ${mismatchType} didn't match the client${componentContext}. This tree will be regenerated on the client.

Common causes of hydration mismatches:
- Conditional rendering: Using ${fromText ? 'random text' : 'different HTML'} based on \`typeof window !== 'undefined'\`
- Dynamic content: Using Date.now(), Math.random(), or other time-dependent values
- Locale-specific formatting: Formatting dates/numbers differently on server and client
- External data changes: Data that changes between server render and client hydration
${specificGuidance}

Browser extensions may also modify the HTML before React loads.

To debug this:
1. Check if your component renders differently on server vs client
2. Ensure all hooks follow the Rules of Hooks
3. Verify \`suppressHydrationWarning\` prop is used correctly if intentional
4. Look for \`useLayoutEffect\` or \`useInsertionEffect\` modifying the DOM

Learn more: https://react.dev/link/hydration-mismatch
${diff}`,
  );
  queueHydrationError(createCapturedValueAtFiber(error, fiber));
  throw HydrationMismatchException;
}

function claimHydratableSingleton(fiber: Fiber): void {
  // $FlowFixMe[constant-condition]
  if (supportsSingletons) {
    if (!isHydrating) {
      return;
    }
    const currentRootContainer = getRootHostContainer();
    const currentHostContext = getHostContext();
    const instance = (fiber.stateNode = resolveSingletonInstance(
      fiber.type,
      fiber.pendingProps,
      currentRootContainer,
      currentHostContext,
      false,
    ));

    if (__DEV__) {
      if (!didSuspendOrErrorDEV) {
        const differences = diffHydratedPropsForDevWarnings(
          // $FlowFixMe[invalid-compare]
          instance,
          fiber.type,
          fiber.pendingProps,
          currentHostContext,
        );
        // $FlowFixMe[invalid-compare]
        if (differences !== null) {
          const diffNode = buildHydrationDiffNode(fiber, 0);
          diffNode.serverProps = differences;
        }
      }
    }

    hydrationParentFiber = fiber;
    rootOrSingletonContext = true;
    nextHydratableInstance = getFirstHydratableChildWithinSingleton(
      fiber.type,
      instance,
      nextHydratableInstance,
    );
  }
}

function tryToClaimNextHydratableInstance(fiber: Fiber): void {
  if (!isHydrating) {
    return;
  }

  // Validate that this is ok to render here before any mismatches.
  const currentHostContext = getHostContext();
  const shouldKeepWarning = validateHydratableInstance(
    fiber.type,
    fiber.pendingProps,
    currentHostContext,
  );

  const nextInstance = nextHydratableInstance;
  if (
    !nextInstance ||
    !tryHydrateInstance(fiber, nextInstance, currentHostContext)
  ) {
    if (shouldKeepWarning) {
      warnNonHydratedInstance(fiber, nextInstance);
    }
    throwOnHydrationMismatch(fiber);
  }
}

function tryToClaimNextHydratableTextInstance(fiber: Fiber): void {
  if (!isHydrating) {
    return;
  }
  const text = fiber.pendingProps;

  let shouldKeepWarning = true;
  // Validate that this is ok to render here before any mismatches.
  const currentHostContext = getHostContext();
  shouldKeepWarning = validateHydratableTextInstance(text, currentHostContext);

  const nextInstance = nextHydratableInstance;
  if (!nextInstance || !tryHydrateText(fiber, nextInstance)) {
    if (shouldKeepWarning) {
      warnNonHydratedInstance(fiber, nextInstance);
    }
    throwOnHydrationMismatch(fiber);
  }
}

function claimNextHydratableActivityInstance(fiber: Fiber): ActivityInstance {
  const nextInstance = nextHydratableInstance;
  const activityInstance = nextInstance
    ? tryHydrateActivity(fiber, nextInstance)
    : null;
  if (activityInstance === null) {
    warnNonHydratedInstance(fiber, nextInstance);
    throw throwOnHydrationMismatch(fiber);
  }
  return activityInstance;
}

function claimNextHydratableSuspenseInstance(fiber: Fiber): SuspenseInstance {
  const nextInstance = nextHydratableInstance;
  const suspenseInstance = nextInstance
    ? tryHydrateSuspense(fiber, nextInstance)
    : null;
  if (suspenseInstance === null) {
    warnNonHydratedInstance(fiber, nextInstance);
    throw throwOnHydrationMismatch(fiber);
  }
  return suspenseInstance;
}

export function tryToClaimNextHydratableFormMarkerInstance(
  fiber: Fiber,
): boolean {
  if (!isHydrating) {
    return false;
  }
  if (nextHydratableInstance) {
    const markerInstance = canHydrateFormStateMarker(
      nextHydratableInstance,
      rootOrSingletonContext,
    );
    if (markerInstance) {
      // Found the marker instance.
      nextHydratableInstance = getNextHydratableSibling(markerInstance);
      // Return true if this marker instance should use the state passed
      // to hydrateRoot.
      // TODO: As an optimization, Fizz should only emit these markers if form
      // state is passed at the root.
      return isFormStateMarkerMatching(markerInstance);
    }
  }
  // Should have found a marker instance. Throw an error to trigger client
  // rendering. We don't bother to check if we're in a concurrent root because
  // useActionState is a new API, so backwards compat is not an issue.
  throwOnHydrationMismatch(fiber);
  return false;
}

function prepareToHydrateHostInstance(
  fiber: Fiber,
  hostContext: HostContext,
): void {
  // $FlowFixMe[constant-condition]
  if (!supportsHydration) {
    throw new Error(
      'Expected prepareToHydrateHostInstance() to never be called. ' +
        'This error is likely caused by a bug in React. Please file an issue.',
    );
  }

  const instance: Instance = fiber.stateNode;
  const didHydrate = hydrateInstance(
    instance,
    fiber.type,
    fiber.memoizedProps,
    hostContext,
    fiber,
  );
  if (!didHydrate) {
    throwOnHydrationMismatch(fiber, true);
  }
}

function prepareToHydrateHostTextInstance(fiber: Fiber): void {
  // $FlowFixMe[constant-condition]
  if (!supportsHydration) {
    throw new Error(
      'Expected prepareToHydrateHostTextInstance() to never be called. ' +
        'This error is likely caused by a bug in React. Please file an issue.',
    );
  }

  const textInstance: TextInstance = fiber.stateNode;
  const textContent: string = fiber.memoizedProps;
  const shouldWarnIfMismatchDev = !didSuspendOrErrorDEV;
  let parentProps = null;
  // We assume that prepareToHydrateHostTextInstance is called in a context where the
  // hydration parent is the parent host component of this host text.
  const returnFiber = hydrationParentFiber;
  if (returnFiber !== null) {
    switch (returnFiber.tag) {
      case HostRoot: {
        if (__DEV__) {
          // $FlowFixMe[invalid-compare]
          if (shouldWarnIfMismatchDev) {
            const difference = diffHydratedTextForDevWarnings(
              textInstance,
              textContent,
              parentProps,
            );
            // $FlowFixMe[invalid-compare]
            if (difference !== null) {
              const diffNode = buildHydrationDiffNode(fiber, 0);
              diffNode.serverProps = difference;
            }
          }
        }
        break;
      }
      case HostSingleton:
      case HostComponent: {
        parentProps = returnFiber.memoizedProps;
        // $FlowFixMe[invalid-compare]
        if (__DEV__) {
          if (shouldWarnIfMismatchDev) {
            const difference = diffHydratedTextForDevWarnings(
              textInstance,
              textContent,
              parentProps,
            );
            // $FlowFixMe[invalid-compare]
            if (difference !== null) {
              const diffNode = buildHydrationDiffNode(fiber, 0);
              diffNode.serverProps = difference;
            }
          }
        }
        break;
      }
    }
    // TODO: What if it's a SuspenseInstance?
  }

  const didHydrate = hydrateTextInstance(
    textInstance,
    textContent,
    fiber,
    parentProps,
  );
  if (!didHydrate) {
    throwOnHydrationMismatch(fiber, true);
  }
}

function prepareToHydrateHostActivityInstance(fiber: Fiber): void {
  // $FlowFixMe[constant-condition]
  if (!supportsHydration) {
    throw new Error(
      'Expected prepareToHydrateHostActivityInstance() to never be called. ' +
        'This error is likely caused by a bug in React. Please file an issue.',
    );
  }
  const activityState: null | ActivityState = fiber.memoizedState;
  const activityInstance: null | ActivityInstance =
    activityState !== null ? activityState.dehydrated : null;

  if (!activityInstance) {
    throw new Error(
      'Expected to have a hydrated activity instance. ' +
        'This error is likely caused by a bug in React. Please file an issue.',
    );
  }

  hydrateActivityInstance(activityInstance, fiber);
}

function prepareToHydrateHostSuspenseInstance(fiber: Fiber): void {
  // $FlowFixMe[constant-condition]
  if (!supportsHydration) {
    throw new Error(
      'Expected prepareToHydrateHostSuspenseInstance() to never be called. ' +
        'This error is likely caused by a bug in React. Please file an issue.',
    );
  }

  const suspenseState: null | SuspenseState = fiber.memoizedState;
  const suspenseInstance: null | SuspenseInstance =
    suspenseState !== null ? suspenseState.dehydrated : null;

  if (!suspenseInstance) {
    throw new Error(
      'Expected to have a hydrated suspense instance. ' +
        'This error is likely caused by a bug in React. Please file an issue.',
    );
  }

  hydrateSuspenseInstance(suspenseInstance, fiber);
}

function skipPastDehydratedActivityInstance(
  fiber: Fiber,
): null | HydratableInstance {
  const activityState: null | ActivityState = fiber.memoizedState;
  const activityInstance: null | ActivityInstance =
    activityState !== null ? activityState.dehydrated : null;

  if (!activityInstance) {
    throw new Error(
      'Expected to have a hydrated suspense instance. ' +
        'This error is likely caused by a bug in React. Please file an issue.',
    );
  }

  return getNextHydratableInstanceAfterActivityInstance(activityInstance);
}

function skipPastDehydratedSuspenseInstance(
  fiber: Fiber,
): null | HydratableInstance {
  // $FlowFixMe[constant-condition]
  if (!supportsHydration) {
    throw new Error(
      'Expected skipPastDehydratedSuspenseInstance() to never be called. ' +
        'This error is likely caused by a bug in React. Please file an issue.',
    );
  }
  const suspenseState: null | SuspenseState = fiber.memoizedState;
  const suspenseInstance: null | SuspenseInstance =
    suspenseState !== null ? suspenseState.dehydrated : null;

  if (!suspenseInstance) {
    throw new Error(
      'Expected to have a hydrated suspense instance. ' +
        'This error is likely caused by a bug in React. Please file an issue.',
    );
  }

  return getNextHydratableInstanceAfterSuspenseInstance(suspenseInstance);
}

function popToNextHostParent(fiber: Fiber): void {
  hydrationParentFiber = fiber.return;
  while (hydrationParentFiber) {
    switch (hydrationParentFiber.tag) {
      case HostComponent:
      case ActivityComponent:
      case SuspenseComponent:
        rootOrSingletonContext = false;
        return;
      case HostSingleton:
      case HostRoot:
        rootOrSingletonContext = true;
        return;
      default:
        hydrationParentFiber = hydrationParentFiber.return;
    }
  }
}

function popHydrationState(fiber: Fiber): boolean {
  // $FlowFixMe[constant-condition]
  if (!supportsHydration) {
    return false;
  }
  if (fiber !== hydrationParentFiber) {
    // We're deeper than the current hydration context, inside an inserted
    // tree.
    return false;
  }
  if (!isHydrating) {
    // If we're not currently hydrating but we're in a hydration context, then
    // we were an insertion and now need to pop up reenter hydration of our
    // siblings.
    popToNextHostParent(fiber);
    isHydrating = true;
    return false;
  }

  const tag = fiber.tag;

  // $FlowFixMe[constant-condition]
  if (supportsSingletons) {
    // With float we never clear the Root, or Singleton instances. We also do not clear Instances
    // that have singleton text content
    if (
      tag !== HostRoot &&
      tag !== HostSingleton &&
      !(
        tag === HostComponent &&
        (!shouldDeleteUnhydratedTailInstances(fiber.type) ||
          shouldSetTextContent(fiber.type, fiber.memoizedProps))
      )
    ) {
      const nextInstance = nextHydratableInstance;
      if (nextInstance) {
        warnIfUnhydratedTailNodes(fiber);
        throwOnHydrationMismatch(fiber);
      }
    }
  } else {
    // If we have any remaining hydratable nodes, we need to delete them now.
    // We only do this deeper than head and body since they tend to have random
    // other nodes in them. We also ignore components with pure text content in
    // side of them. We also don't delete anything inside the root container.
    if (
      tag !== HostRoot &&
      (tag !== HostComponent ||
        (shouldDeleteUnhydratedTailInstances(fiber.type) &&
          !shouldSetTextContent(fiber.type, fiber.memoizedProps)))
    ) {
      const nextInstance = nextHydratableInstance;
      if (nextInstance) {
        warnIfUnhydratedTailNodes(fiber);
        throwOnHydrationMismatch(fiber);
      }
    }
  }
  popToNextHostParent(fiber);
  if (tag === SuspenseComponent) {
    nextHydratableInstance = skipPastDehydratedSuspenseInstance(fiber);
  } else if (tag === ActivityComponent) {
    nextHydratableInstance = skipPastDehydratedActivityInstance(fiber);
    // $FlowFixMe[constant-condition]
  } else if (supportsSingletons && tag === HostSingleton) {
    nextHydratableInstance = getNextHydratableSiblingAfterSingleton(
      fiber.type,
      nextHydratableInstance,
    );
  } else {
    nextHydratableInstance = hydrationParentFiber
      ? getNextHydratableSibling(fiber.stateNode)
      : null;
  }
  return true;
}

// $FlowFixMe[invalid-compare]
function warnIfUnhydratedTailNodes(fiber: Fiber) {
  if (__DEV__) {
    let nextInstance = nextHydratableInstance;
    while (nextInstance) {
      const diffNode = buildHydrationDiffNode(fiber, 0);
      const description =
        describeHydratableInstanceForDevWarnings(nextInstance);
      diffNode.serverTail.push(description);
      // $FlowFixMe[invalid-compare]
      if (description.type === 'Suspense') {
        const suspenseInstance: SuspenseInstance = nextInstance as any;
        nextInstance =
          getNextHydratableInstanceAfterSuspenseInstance(suspenseInstance);
      } else {
        nextInstance = getNextHydratableSibling(nextInstance);
      }
    }
  }
}

function resetHydrationState(): void {
  // $FlowFixMe[constant-condition]
  if (!supportsHydration) {
    return;
  }

  hydrationParentFiber = null;
  nextHydratableInstance = null;
  isHydrating = false;
  didSuspendOrErrorDEV = false;
}

// Restore the hydration cursor when unwinding a HostComponent that already
// claimed a DOM node. This is a fork of popHydrationState that does all the
// same validity checks but restores the cursor to this fiber's DOM node
// instead of advancing past it. It also does NOT clear unhydrated tail nodes
// or throw on mismatches since we're unwinding, not completing.
//
// This is needed when replaySuspendedUnitOfWork calls unwindInterruptedWork
// before re-running beginWork on the same fiber, or when throwAndUnwindWorkLoop
// calls unwindWork on ancestor fibers.
function popHydrationStateOnInterruptedWork(fiber: Fiber): void {
  // $FlowFixMe[constant-condition]
  if (!supportsHydration) {
    return;
  }
  if (fiber !== hydrationParentFiber) {
    // We're deeper than the current hydration context, inside an inserted
    // tree. Don't touch the cursor.
    return;
  }
  if (!isHydrating) {
    // If we're not currently hydrating but we're in a hydration context, then
    // we were an insertion and now need to pop up to reenter hydration of our
    // siblings. Same as popHydrationState.
    popToNextHostParent(fiber);
    isHydrating = true;
    return;
  }

  // We're in a valid hydration context. Restore the cursor to this fiber's
  // DOM node so that when beginWork re-runs, it can claim the same node.
  // Unlike popHydrationState, we do NOT check for unhydrated tail nodes
  // or advance the cursor - we're restoring, not completing.
  popToNextHostParent(fiber);
  if (fiber.tag === HostComponent && fiber.stateNode != null) {
    nextHydratableInstance = fiber.stateNode;
  }
}

export function upgradeHydrationErrorsToRecoverable(): Array<
  CapturedValue<mixed>,
> | null {
  const queuedErrors = hydrationErrors;
  if (queuedErrors !== null) {
    // Successfully completed a forced client render. The errors that occurred
    // during the hydration attempt are now recovered. We will log them in
    // commit phase, once the entire tree has finished.
    queueRecoverableErrors(queuedErrors);
    hydrationErrors = null;
  }
  return queuedErrors;
}

function getIsHydrating(): boolean {
  return isHydrating;
}

export function queueHydrationError(error: CapturedValue<mixed>): void {
  if (hydrationErrors === null) {
    hydrationErrors = [error];
  } else {
    hydrationErrors.push(error);
  }
}

export function emitPendingHydrationWarnings() {
  if (__DEV__) {
    // If we haven't yet thrown any hydration errors by the time we reach the end we've successfully
    // hydrated, however, we might still have DEV-only mismatches that we log now.
    const diffRoot = hydrationDiffRootDEV;
    if (diffRoot !== null) {
      hydrationDiffRootDEV = null;
      const diff = describeDiff(diffRoot);

      // Just pick the DFS-first leaf as the owner.
      // Should be good enough since most warnings only have a single error.
      let diffOwner: HydrationDiffNode = diffRoot;
      while (diffOwner.children.length > 0) {
        diffOwner = diffOwner.children[0];
      }

      runWithFiberInDEV(diffOwner.fiber, () => {
        const componentName = getComponentNameFromFiber(diffOwner.fiber);
        const componentContext = componentName ? ` in <${componentName}>` : '';
        console.error(
          `Warning: Hydration attribute mismatch${componentContext}\n` +
            '\n' +
            'The HTML attributes rendered on the server differed from the client. ' +
            "React won't patch up these mismatched attributes, even though the tree structure matched, " +
            'so this can cause visual or behavioral inconsistencies.\n' +
            '\n' +
            'This typically happens when a Client Component uses:\n' +
            "- Conditional attributes based on `typeof window !== 'undefined'`\n" +
            '- Time-dependent values like Date.now() or Math.random()\n' +
            '- Locale-specific formatting for dates, numbers, or strings\n' +
            '- Data that changes between server render and client hydration\n' +
            '\n' +
            'To fix this:\n' +
            '1. Ensure server and client render identical attributes\n' +
            '2. Use suppressHydrationWarning prop if the mismatch is intentional\n' +
            '3. Move dynamic content into useEffect or useLayoutEffect\n' +
            '\n' +
            'Learn more: https://react.dev/link/hydration-mismatch\n' +
            '%s%s',
          'https://react.dev/link/hydration-mismatch',
          diff,
        );
      });
    }
  }
}

export {
  warnIfHydrating,
  enterHydrationState,
  getIsHydrating,
  reenterHydrationStateFromDehydratedActivityInstance,
  reenterHydrationStateFromDehydratedSuspenseInstance,
  resetHydrationState,
  popHydrationStateOnInterruptedWork,
  claimHydratableSingleton,
  tryToClaimNextHydratableInstance,
  tryToClaimNextHydratableTextInstance,
  claimNextHydratableActivityInstance,
  claimNextHydratableSuspenseInstance,
  prepareToHydrateHostInstance,
  prepareToHydrateHostTextInstance,
  prepareToHydrateHostActivityInstance,
  prepareToHydrateHostSuspenseInstance,
  popHydrationState,
};
