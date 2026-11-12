/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber} from './ReactInternalTypes';

import {runWithFiberInDEV} from './ReactCurrentFiber';
import getComponentNameFromFiber from 'react-reconciler/src/getComponentNameFromFiber';
import {StrictLegacyMode} from './ReactTypeOfMode';

type FiberArray = Array<Fiber>;
type FiberToFiberComponentsMap = Map<Fiber, FiberArray>;

const ReactStrictModeWarnings = {
  recordUnsafeLifecycleWarnings: (fiber: Fiber, instance: any): void => {},
  flushPendingUnsafeLifecycleWarnings: (): void => {},
  recordLegacyContextWarning: (fiber: Fiber, instance: any): void => {},
  flushLegacyContextWarning: (): void => {},
  discardPendingWarnings: (): void => {},
};

if (__DEV__) {
  const findStrictRoot = (fiber: Fiber): Fiber | null => {
    let maybeStrictRoot = null;

    let node: null | Fiber = fiber;
    while (node !== null) {
      if (node.mode & StrictLegacyMode) {
        maybeStrictRoot = node;
      }
      node = node.return;
    }

    return maybeStrictRoot;
  };

  const setToSortedString = (set: Set<string>) => {
    const array = [];
    set.forEach(value => {
      array.push(value);
    });
    return array.sort().join(', ');
  };

  let pendingComponentWillMountWarnings: Array<Fiber> = [];
  let pendingUNSAFE_ComponentWillMountWarnings: Array<Fiber> = [];
  let pendingComponentWillReceivePropsWarnings: Array<Fiber> = [];
  let pendingUNSAFE_ComponentWillReceivePropsWarnings: Array<Fiber> = [];
  let pendingComponentWillUpdateWarnings: Array<Fiber> = [];
  let pendingUNSAFE_ComponentWillUpdateWarnings: Array<Fiber> = [];

  // Tracks components we have already warned about.
  const didWarnAboutUnsafeLifecycles = new Set<mixed>();

  ReactStrictModeWarnings.recordUnsafeLifecycleWarnings = (
    fiber: Fiber,
    instance: any,
  ) => {
    // Dedupe strategy: Warn once per component.
    if (didWarnAboutUnsafeLifecycles.has(fiber.type)) {
      return;
    }

    if (
      typeof instance.componentWillMount === 'function' &&
      // Don't warn about react-lifecycles-compat polyfilled components.
      instance.componentWillMount.__suppressDeprecationWarning !== true
    ) {
      pendingComponentWillMountWarnings.push(fiber);
    }

    if (
      fiber.mode & StrictLegacyMode &&
      typeof instance.UNSAFE_componentWillMount === 'function'
    ) {
      pendingUNSAFE_ComponentWillMountWarnings.push(fiber);
    }

    if (
      typeof instance.componentWillReceiveProps === 'function' &&
      instance.componentWillReceiveProps.__suppressDeprecationWarning !== true
    ) {
      pendingComponentWillReceivePropsWarnings.push(fiber);
    }

    if (
      fiber.mode & StrictLegacyMode &&
      typeof instance.UNSAFE_componentWillReceiveProps === 'function'
    ) {
      pendingUNSAFE_ComponentWillReceivePropsWarnings.push(fiber);
    }

    if (
      typeof instance.componentWillUpdate === 'function' &&
      instance.componentWillUpdate.__suppressDeprecationWarning !== true
    ) {
      pendingComponentWillUpdateWarnings.push(fiber);
    }

    if (
      fiber.mode & StrictLegacyMode &&
      typeof instance.UNSAFE_componentWillUpdate === 'function'
    ) {
      pendingUNSAFE_ComponentWillUpdateWarnings.push(fiber);
    }
  };

  ReactStrictModeWarnings.flushPendingUnsafeLifecycleWarnings = () => {
    // We do an initial pass to gather component names
    const componentWillMountUniqueNames = new Set<string>();
    if (pendingComponentWillMountWarnings.length > 0) {
      pendingComponentWillMountWarnings.forEach(fiber => {
        componentWillMountUniqueNames.add(
          getComponentNameFromFiber(fiber) || 'Component',
        );
        didWarnAboutUnsafeLifecycles.add(fiber.type);
      });
      pendingComponentWillMountWarnings = [];
    }

    const UNSAFE_componentWillMountUniqueNames = new Set<string>();
    if (pendingUNSAFE_ComponentWillMountWarnings.length > 0) {
      pendingUNSAFE_ComponentWillMountWarnings.forEach(fiber => {
        UNSAFE_componentWillMountUniqueNames.add(
          getComponentNameFromFiber(fiber) || 'Component',
        );
        didWarnAboutUnsafeLifecycles.add(fiber.type);
      });
      pendingUNSAFE_ComponentWillMountWarnings = [];
    }

    const componentWillReceivePropsUniqueNames = new Set<string>();
    if (pendingComponentWillReceivePropsWarnings.length > 0) {
      pendingComponentWillReceivePropsWarnings.forEach(fiber => {
        componentWillReceivePropsUniqueNames.add(
          getComponentNameFromFiber(fiber) || 'Component',
        );
        didWarnAboutUnsafeLifecycles.add(fiber.type);
      });

      pendingComponentWillReceivePropsWarnings = [];
    }

    const UNSAFE_componentWillReceivePropsUniqueNames = new Set<string>();
    if (pendingUNSAFE_ComponentWillReceivePropsWarnings.length > 0) {
      pendingUNSAFE_ComponentWillReceivePropsWarnings.forEach(fiber => {
        UNSAFE_componentWillReceivePropsUniqueNames.add(
          getComponentNameFromFiber(fiber) || 'Component',
        );
        didWarnAboutUnsafeLifecycles.add(fiber.type);
      });

      pendingUNSAFE_ComponentWillReceivePropsWarnings = [];
    }

    const componentWillUpdateUniqueNames = new Set<string>();
    if (pendingComponentWillUpdateWarnings.length > 0) {
      pendingComponentWillUpdateWarnings.forEach(fiber => {
        componentWillUpdateUniqueNames.add(
          getComponentNameFromFiber(fiber) || 'Component',
        );
        didWarnAboutUnsafeLifecycles.add(fiber.type);
      });

      pendingComponentWillUpdateWarnings = [];
    }

    const UNSAFE_componentWillUpdateUniqueNames = new Set<string>();
    if (pendingUNSAFE_ComponentWillUpdateWarnings.length > 0) {
      pendingUNSAFE_ComponentWillUpdateWarnings.forEach(fiber => {
        UNSAFE_componentWillUpdateUniqueNames.add(
          getComponentNameFromFiber(fiber) || 'Component',
        );
        didWarnAboutUnsafeLifecycles.add(fiber.type);
      });

      pendingUNSAFE_ComponentWillUpdateWarnings = [];
    }

    // Finally, we flush all the warnings
    // UNSAFE_ ones before the deprecated ones, since they'll be 'louder'
    if (UNSAFE_componentWillMountUniqueNames.size > 0) {
      const sortedNames = setToSortedString(
        UNSAFE_componentWillMountUniqueNames,
      );
      console.error(
        'Using UNSAFE_componentWillMount in strict mode is not recommended and may indicate bugs in your code. ' +
          'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
          '* Move code with side effects to componentDidMount, and set initial state in the constructor.\n' +
          '\nPlease update the following components: %s',
        sortedNames,
      );
    }

    if (UNSAFE_componentWillReceivePropsUniqueNames.size > 0) {
      const sortedNames = setToSortedString(
        UNSAFE_componentWillReceivePropsUniqueNames,
      );
      console.error(
        'Using UNSAFE_componentWillReceiveProps in strict mode is not recommended ' +
          'and may indicate bugs in your code. ' +
          'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
          '* Move data fetching code or side effects to componentDidUpdate.\n' +
          "* If you're updating state whenever props change, " +
          'refactor your code to use memoization techniques or move it to ' +
          'static getDerivedStateFromProps. Learn more at: https://react.dev/link/derived-state\n' +
          '\nPlease update the following components: %s',
        sortedNames,
      );
    }

    if (UNSAFE_componentWillUpdateUniqueNames.size > 0) {
      const sortedNames = setToSortedString(
        UNSAFE_componentWillUpdateUniqueNames,
      );
      console.error(
        'Using UNSAFE_componentWillUpdate in strict mode is not recommended ' +
          'and may indicate bugs in your code. ' +
          'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
          '* Move data fetching code or side effects to componentDidUpdate.\n' +
          '\nPlease update the following components: %s',
        sortedNames,
      );
    }

    if (componentWillMountUniqueNames.size > 0) {
      const sortedNames = setToSortedString(componentWillMountUniqueNames);

      console.warn(
        'componentWillMount has been renamed, and is not recommended for use. ' +
          'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
          '* Move code with side effects to componentDidMount, and set initial state in the constructor.\n' +
          '* Rename componentWillMount to UNSAFE_componentWillMount to suppress ' +
          'this warning in non-strict mode. In React 18.x, only the UNSAFE_ name will work. ' +
          'To rename all deprecated lifecycles to their new names, you can run ' +
          '`npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n' +
          '\nPlease update the following components: %s',
        sortedNames,
      );
    }

    if (componentWillReceivePropsUniqueNames.size > 0) {
      const sortedNames = setToSortedString(
        componentWillReceivePropsUniqueNames,
      );

      console.warn(
        'componentWillReceiveProps has been renamed, and is not recommended for use. ' +
          'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
          '* Move data fetching code or side effects to componentDidUpdate.\n' +
          "* If you're updating state whenever props change, refactor your " +
          'code to use memoization techniques or move it to ' +
          'static getDerivedStateFromProps. Learn more at: https://react.dev/link/derived-state\n' +
          '* Rename componentWillReceiveProps to UNSAFE_componentWillReceiveProps to suppress ' +
          'this warning in non-strict mode. In React 18.x, only the UNSAFE_ name will work. ' +
          'To rename all deprecated lifecycles to their new names, you can run ' +
          '`npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n' +
          '\nPlease update the following components: %s',
        sortedNames,
      );
    }

    if (componentWillUpdateUniqueNames.size > 0) {
      const sortedNames = setToSortedString(componentWillUpdateUniqueNames);

      console.warn(
        'componentWillUpdate has been renamed, and is not recommended for use. ' +
          'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
          '* Move data fetching code or side effects to componentDidUpdate.\n' +
          '* Rename componentWillUpdate to UNSAFE_componentWillUpdate to suppress ' +
          'this warning in non-strict mode. In React 18.x, only the UNSAFE_ name will work. ' +
          'To rename all deprecated lifecycles to their new names, you can run ' +
          '`npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n' +
          '\nPlease update the following components: %s',
        sortedNames,
      );
    }
  };

  let pendingLegacyContextWarning: FiberToFiberComponentsMap = new Map();

  // Tracks components we have already warned about.
  const didWarnAboutLegacyContext = new Set<mixed>();

  ReactStrictModeWarnings.recordLegacyContextWarning = (
    fiber: Fiber,
    instance: any,
  ) => {
    const strictRoot = findStrictRoot(fiber);
    if (strictRoot === null) {
      console.error(
        'Expected to find a StrictMode component in a strict mode tree. ' +
          'This error is likely caused by a bug in React. Please file an issue.',
      );
      return;
    }

    // Dedup strategy: Warn once per component.
    if (didWarnAboutLegacyContext.has(fiber.type)) {
      return;
    }

    let warningsForRoot = pendingLegacyContextWarning.get(strictRoot);

    if (
      fiber.type.contextTypes != null ||
      fiber.type.childContextTypes != null ||
      (instance !== null && typeof instance.getChildContext === 'function')
    ) {
      if (warningsForRoot === undefined) {
        warningsForRoot = [];
        pendingLegacyContextWarning.set(strictRoot, warningsForRoot);
      }
      warningsForRoot.push(fiber);
    }
  };

  ReactStrictModeWarnings.flushLegacyContextWarning = () => {
    (pendingLegacyContextWarning as any as FiberToFiberComponentsMap).forEach(
      (fiberArray: FiberArray, strictRoot) => {
        if (fiberArray.length === 0) {
          return;
        }
        const firstFiber = fiberArray[0];

        const uniqueNames = new Set<string>();
        fiberArray.forEach(fiber => {
          uniqueNames.add(getComponentNameFromFiber(fiber) || 'Component');
          didWarnAboutLegacyContext.add(fiber.type);
        });

        const sortedNames = setToSortedString(uniqueNames);

        runWithFiberInDEV(firstFiber, () => {
          console.error(
            'Legacy context API has been detected within a strict-mode tree.' +
              '\n\nThe old API will be supported in all 16.x releases, but applications ' +
              'using it should migrate to the new version.' +
              '\n\nPlease update the following components: %s' +
              '\n\nLearn more about this warning here: https://react.dev/link/legacy-context',
            sortedNames,
          );
        });
      },
    );
  };

  ReactStrictModeWarnings.discardPendingWarnings = () => {
    pendingComponentWillMountWarnings = [];
    pendingUNSAFE_ComponentWillMountWarnings = [];
    pendingComponentWillReceivePropsWarnings = [];
    pendingUNSAFE_ComponentWillReceivePropsWarnings = [];
    pendingComponentWillUpdateWarnings = [];
    pendingUNSAFE_ComponentWillUpdateWarnings = [];
    pendingLegacyContextWarning = new Map();
  };
}

export default ReactStrictModeWarnings;
