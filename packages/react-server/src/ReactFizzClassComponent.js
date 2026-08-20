/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {emptyContextObject} from './ReactFizzLegacyContext';
import {readContext} from './ReactFizzNewContext';

import {disableLegacyContext} from 'shared/ReactFeatureFlags';
import {get as getInstance, set as setInstance} from 'shared/ReactInstanceMap';
import getComponentNameFromType from 'shared/getComponentNameFromType';
import {REACT_CONTEXT_TYPE, REACT_CONSUMER_TYPE} from 'shared/ReactSymbols';
import assign from 'shared/assign';
import isArray from 'shared/isArray';

const didWarnAboutNoopUpdateForComponent: {[string]: boolean} = {};
const didWarnAboutDeprecatedWillMount: {[string]: boolean} = {};

let didWarnAboutUninitializedState;
let didWarnAboutGetSnapshotBeforeUpdateWithoutDidUpdate;
let didWarnAboutLegacyLifecyclesAndDerivedState;
let didWarnAboutUndefinedDerivedState;
let didWarnAboutDirectlyAssigningPropsToState;
let didWarnAboutContextTypeAndContextTypes;
let didWarnAboutContextTypes;
let didWarnAboutChildContextTypes;
let didWarnAboutInvalidateContextType;
let didWarnOnInvalidCallback;

if (__DEV__) {
  didWarnAboutUninitializedState = new Set<string>();
  didWarnAboutGetSnapshotBeforeUpdateWithoutDidUpdate = new Set<mixed>();
  didWarnAboutLegacyLifecyclesAndDerivedState = new Set<string>();
  didWarnAboutDirectlyAssigningPropsToState = new Set<string>();
  didWarnAboutUndefinedDerivedState = new Set<string>();
  didWarnAboutContextTypeAndContextTypes = new Set<mixed>();
  didWarnAboutContextTypes = new Set<mixed>();
  didWarnAboutChildContextTypes = new Set<mixed>();
  didWarnAboutInvalidateContextType = new Set<mixed>();
  didWarnOnInvalidCallback = new Set<string>();
}

function warnOnInvalidCallback(callback: mixed) {
  if (__DEV__) {
    if (callback === null || typeof callback === 'function') {
      return;
    }
    // eslint-disable-next-line react-internal/safe-string-coercion
    const key = String(callback);
    if (!didWarnOnInvalidCallback.has(key)) {
      didWarnOnInvalidCallback.add(key);
      console.error(
        'Expected the last optional `callback` argument to be a ' +
          'function. Instead received: %s.',
        callback,
      );
    }
  }
}

function warnOnUndefinedDerivedState(type: any, partialState: any) {
  if (__DEV__) {
    if (partialState === undefined) {
      const componentName = getComponentNameFromType(type) || 'Component';
      if (!didWarnAboutUndefinedDerivedState.has(componentName)) {
        didWarnAboutUndefinedDerivedState.add(componentName);
        console.error(
          '%s.getDerivedStateFromProps(): A valid state object (or null) must be returned. ' +
            'You have returned undefined.',
          componentName,
        );
      }
    }
  }
}

function warnNoop(
  publicInstance: component(...props: any),
  callerName: string,
) {
  if (__DEV__) {
    const constructor = publicInstance.constructor;
    const componentName =
      (constructor && getComponentNameFromType(constructor)) || 'ReactClass';
    const warningKey = componentName + '.' + callerName;
    if (didWarnAboutNoopUpdateForComponent[warningKey]) {
      return;
    }

    console.error(
      'Can only update a mounting component. ' +
        'This usually means you called %s() outside componentWillMount() on the server. ' +
        'This is a no-op.\n\nPlease check the code for the %s component.',
      callerName,
      componentName,
    );
    didWarnAboutNoopUpdateForComponent[warningKey] = true;
  }
}

type InternalInstance = {
  queue: null | Array<Object>,
  replace: boolean,
};

const classComponentUpdater = {
  // $FlowFixMe[missing-local-annot]
  enqueueSetState(inst: any, payload: any, callback) {
    const internals: InternalInstance = getInstance(inst);
    if (internals.queue === null) {
      warnNoop(inst, 'setState');
    } else {
      internals.queue.push(payload);
      if (__DEV__) {
        if (callback !== undefined && callback !== null) {
          warnOnInvalidCallback(callback);
        }
      }
    }
  },
  enqueueReplaceState(inst: any, payload: any, callback: null) {
    const internals: InternalInstance = getInstance(inst);
    internals.replace = true;
    internals.queue = [payload];
    if (__DEV__) {
      if (callback !== undefined && callback !== null) {
        warnOnInvalidCallback(callback);
      }
    }
  },
  // $FlowFixMe[missing-local-annot]
  enqueueForceUpdate(inst: any, callback) {
    const internals: InternalInstance = getInstance(inst);
    if (internals.queue === null) {
      warnNoop(inst, 'forceUpdate');
    } else {
      if (__DEV__) {
        if (callback !== undefined && callback !== null) {
          warnOnInvalidCallback(callback);
        }
      }
    }
  },
};

function applyDerivedStateFromProps(
  instance: any,
  ctor: any,
  getDerivedStateFromProps: (props: any, state: any) => any,
  prevState: any,
  nextProps: any,
) {
  const partialState = getDerivedStateFromProps(nextProps, prevState);

  if (__DEV__) {
    warnOnUndefinedDerivedState(ctor, partialState);
  }
  // Merge the partial state and the previous state.
  const newState =
    partialState === null || partialState === undefined
      ? prevState
      : assign({}, prevState, partialState);
  return newState;
}

export function constructClassInstance(
  ctor: any,
  props: any,
  maskedLegacyContext: any,
): any {
  let context = emptyContextObject;
  const contextType = ctor.contextType;

  if (__DEV__) {
    if ('contextType' in ctor) {
      const isValid =
        // Allow null for conditional declaration
        contextType === null ||
        (contextType !== undefined &&
          contextType.$$typeof === REACT_CONTEXT_TYPE);

      if (!isValid && !didWarnAboutInvalidateContextType.has(ctor)) {
        didWarnAboutInvalidateContextType.add(ctor);

        let addendum = '';
        if (contextType === undefined) {
          addendum =
            ' However, it is set to undefined. ' +
            'This can be caused by a typo or by mixing up named and default imports. ' +
            'This can also happen due to a circular dependency, so ' +
            'try moving the createContext() call to a separate file.';
        } else if (typeof contextType !== 'object') {
          addendum = ' However, it is set to a ' + typeof contextType + '.';
        } else if (contextType.$$typeof === REACT_CONSUMER_TYPE) {
          addendum = ' Did you accidentally pass the Context.Consumer instead?';
        } else {
          addendum =
            ' However, it is set to an object with keys {' +
            Object.keys(contextType).join(', ') +
            '}.';
        }
        console.error(
          '%s defines an invalid contextType. ' +
            'contextType should point to the Context object returned by React.createContext().%s',
          getComponentNameFromType(ctor) || 'Component',
          addendum,
        );
      }
    }
  }

  if (typeof contextType === 'object' && contextType !== null) {
    context = readContext(contextType as any);
  } else if (!disableLegacyContext) {
    context = maskedLegacyContext;
  }

  const instance = new ctor(props, context);

  if (__DEV__) {
    if (
      typeof ctor.getDerivedStateFromProps === 'function' &&
      (instance.state === null || instance.state === undefined)
    ) {
      const componentName = getComponentNameFromType(ctor) || 'Component';
      if (!didWarnAboutUninitializedState.has(componentName)) {
        didWarnAboutUninitializedState.add(componentName);
        console.error(
          '`%s` uses `getDerivedStateFromProps` but its initial state is ' +
            '%s. This is not recommended. Instead, define the initial state by ' +
            'assigning an object to `this.state` in the constructor of `%s`. ' +
            'This ensures that `getDerivedStateFromProps` arguments have a consistent shape.',
          componentName,
          instance.state === null ? 'null' : 'undefined',
          componentName,
        );
      }
    }

    // If new component APIs are defined, "unsafe" lifecycles won't be called.
    // Warn about these lifecycles if they are present.
    // Don't warn about react-lifecycles-compat polyfilled methods though.
    if (
      typeof ctor.getDerivedStateFromProps === 'function' ||
      typeof instance.getSnapshotBeforeUpdate === 'function'
    ) {
      let foundWillMountName = null;
      let foundWillReceivePropsName = null;
      let foundWillUpdateName = null;
      if (
        typeof instance.componentWillMount === 'function' &&
        instance.componentWillMount.__suppressDeprecationWarning !== true
      ) {
        foundWillMountName = 'componentWillMount';
      } else if (typeof instance.UNSAFE_componentWillMount === 'function') {
        foundWillMountName = 'UNSAFE_componentWillMount';
      }
      if (
        typeof instance.componentWillReceiveProps === 'function' &&
        instance.componentWillReceiveProps.__suppressDeprecationWarning !== true
      ) {
        foundWillReceivePropsName = 'componentWillReceiveProps';
      } else if (
        typeof instance.UNSAFE_componentWillReceiveProps === 'function'
      ) {
        foundWillReceivePropsName = 'UNSAFE_componentWillReceiveProps';
      }
      if (
        typeof instance.componentWillUpdate === 'function' &&
        instance.componentWillUpdate.__suppressDeprecationWarning !== true
      ) {
        foundWillUpdateName = 'componentWillUpdate';
      } else if (typeof instance.UNSAFE_componentWillUpdate === 'function') {
        foundWillUpdateName = 'UNSAFE_componentWillUpdate';
      }
      if (
        foundWillMountName !== null ||
        foundWillReceivePropsName !== null ||
        foundWillUpdateName !== null
      ) {
        const componentName = getComponentNameFromType(ctor) || 'Component';
        const newApiName =
          typeof ctor.getDerivedStateFromProps === 'function'
            ? 'getDerivedStateFromProps()'
            : 'getSnapshotBeforeUpdate()';
        if (!didWarnAboutLegacyLifecyclesAndDerivedState.has(componentName)) {
          didWarnAboutLegacyLifecyclesAndDerivedState.add(componentName);
          console.error(
            'Unsafe legacy lifecycles will not be called for components using new component APIs.\n\n' +
              '%s uses %s but also contains the following legacy lifecycles:%s%s%s\n\n' +
              'The above lifecycles should be removed. Learn more about this warning here:\n' +
              'https://react.dev/link/unsafe-component-lifecycles',
            componentName,
            newApiName,
            foundWillMountName !== null ? `\n  ${foundWillMountName}` : '',
            foundWillReceivePropsName !== null
              ? `\n  ${foundWillReceivePropsName}`
              : '',
            foundWillUpdateName !== null ? `\n  ${foundWillUpdateName}` : '',
          );
        }
      }
    }
  }

  return instance;
}

function checkClassInstance(instance: any, ctor: any, newProps: any) {
  if (__DEV__) {
    const name = getComponentNameFromType(ctor) || 'Component';
    const renderPresent = instance.render;

    if (!renderPresent) {
      if (ctor.prototype && typeof ctor.prototype.render === 'function') {
        console.error(
          'No `render` method found on the %s ' +
            'instance: did you accidentally return an object from the constructor?',
          name,
        );
      } else {
        console.error(
          'No `render` method found on the %s ' +
            'instance: you may have forgotten to define `render`.',
          name,
        );
      }
    }

    if (
      instance.getInitialState &&
      !instance.getInitialState.isReactClassApproved &&
      !instance.state
    ) {
      console.error(
        'getInitialState was defined on %s, a plain JavaScript class. ' +
          'This is only supported for classes created using React.createClass. ' +
          'Did you mean to define a state property instead?',
        name,
      );
    }
    if (
      instance.getDefaultProps &&
      !instance.getDefaultProps.isReactClassApproved
    ) {
      console.error(
        'getDefaultProps was defined on %s, a plain JavaScript class. ' +
          'This is only supported for classes created using React.createClass. ' +
          'Use a static property to define defaultProps instead.',
        name,
      );
    }
    if (instance.contextType) {
      console.error(
        'contextType was defined as an instance property on %s. Use a static ' +
          'property to define contextType instead.',
        name,
      );
    }

    if (disableLegacyContext) {
      if (ctor.childContextTypes && !didWarnAboutChildContextTypes.has(ctor)) {
        didWarnAboutChildContextTypes.add(ctor);
        console.error(
          '%s uses the legacy childContextTypes API which was removed in React 19. ' +
            'Use React.createContext() instead. (https://react.dev/link/legacy-context)',
          name,
        );
      }
      if (ctor.contextTypes && !didWarnAboutContextTypes.has(ctor)) {
        didWarnAboutContextTypes.add(ctor);
        console.error(
          '%s uses the legacy contextTypes API which was removed in React 19. ' +
            'Use React.createContext() with static contextType instead. ' +
            '(https://react.dev/link/legacy-context)',
          name,
        );
      }
    } else {
      if (instance.contextTypes) {
        console.error(
          'contextTypes was defined as an instance property on %s. Use a static ' +
            'property to define contextTypes instead. (https://react.dev/link/legacy-context)',
          name,
        );
      }

      if (
        ctor.contextType &&
        ctor.contextTypes &&
        !didWarnAboutContextTypeAndContextTypes.has(ctor)
      ) {
        didWarnAboutContextTypeAndContextTypes.add(ctor);
        console.error(
          '%s declares both contextTypes and contextType static properties. ' +
            'The legacy contextTypes property will be ignored.',
          name,
        );
      }
      if (ctor.childContextTypes && !didWarnAboutChildContextTypes.has(ctor)) {
        didWarnAboutChildContextTypes.add(ctor);
        console.error(
          '%s uses the legacy childContextTypes API which will soon be removed. ' +
            'Use React.createContext() instead. (https://react.dev/link/legacy-context)',
          name,
        );
      }
      if (ctor.contextTypes && !didWarnAboutContextTypes.has(ctor)) {
        didWarnAboutContextTypes.add(ctor);
        console.error(
          '%s uses the legacy contextTypes API which will soon be removed. ' +
            'Use React.createContext() with static contextType instead. ' +
            '(https://react.dev/link/legacy-context)',
          name,
        );
      }
    }

    if (typeof instance.componentShouldUpdate === 'function') {
      console.error(
        '%s has a method called ' +
          'componentShouldUpdate(). Did you mean shouldComponentUpdate()? ' +
          'The name is phrased as a question because the function is ' +
          'expected to return a value.',
        name,
      );
    }
    if (
      ctor.prototype &&
      ctor.prototype.isPureReactComponent &&
      typeof instance.shouldComponentUpdate !== 'undefined'
    ) {
      console.error(
        '%s has a method called shouldComponentUpdate(). ' +
          'shouldComponentUpdate should not be used when extending React.PureComponent. ' +
          'Please extend React.Component if shouldComponentUpdate is used.',
        getComponentNameFromType(ctor) || 'A pure component',
      );
    }
    if (typeof instance.componentDidUnmount === 'function') {
      console.error(
        '%s has a method called ' +
          'componentDidUnmount(). But there is no such lifecycle method. ' +
          'Did you mean componentWillUnmount()?',
        name,
      );
    }
    if (typeof instance.componentDidReceiveProps === 'function') {
      console.error(
        '%s has a method called ' +
          'componentDidReceiveProps(). But there is no such lifecycle method. ' +
          'If you meant to update the state in response to changing props, ' +
          'use componentWillReceiveProps(). If you meant to fetch data or ' +
          'run side-effects or mutations after React has updated the UI, use componentDidUpdate().',
        name,
      );
    }
    if (typeof instance.componentWillRecieveProps === 'function') {
      console.error(
        '%s has a method called ' +
          'componentWillRecieveProps(). Did you mean componentWillReceiveProps()?',
        name,
      );
    }
    if (typeof instance.UNSAFE_componentWillRecieveProps === 'function') {
      console.error(
        '%s has a method called ' +
          'UNSAFE_componentWillRecieveProps(). Did you mean UNSAFE_componentWillReceiveProps()?',
        name,
      );
    }
    const hasMutatedProps = instance.props !== newProps;
    if (instance.props !== undefined && hasMutatedProps) {
      console.error(
        'When calling super() in `%s`, make sure to pass ' +
          "up the same props that your component's constructor was passed.",
        name,
      );
    }
    if (instance.defaultProps) {
      console.error(
        'Setting defaultProps as an instance property on %s is not supported and will be ignored.' +
          ' Instead, define defaultProps as a static property on %s.',
        name,
        name,
      );
    }

    if (
      typeof instance.getSnapshotBeforeUpdate === 'function' &&
      typeof instance.componentDidUpdate !== 'function' &&
      !didWarnAboutGetSnapshotBeforeUpdateWithoutDidUpdate.has(ctor)
    ) {
      didWarnAboutGetSnapshotBeforeUpdateWithoutDidUpdate.add(ctor);
      console.error(
        '%s: getSnapshotBeforeUpdate() should be used with componentDidUpdate(). ' +
          'This component defines getSnapshotBeforeUpdate() only.',
        getComponentNameFromType(ctor),
      );
    }

    if (typeof instance.getDerivedStateFromProps === 'function') {
      console.error(
        '%s: getDerivedStateFromProps() is defined as an instance method ' +
          'and will be ignored. Instead, declare it as a static method.',
        name,
      );
    }
    if (typeof instance.getDerivedStateFromError === 'function') {
      console.error(
        '%s: getDerivedStateFromError() is defined as an instance method ' +
          'and will be ignored. Instead, declare it as a static method.',
        name,
      );
    }
    if (typeof ctor.getSnapshotBeforeUpdate === 'function') {
      console.error(
        '%s: getSnapshotBeforeUpdate() is defined as a static method ' +
          'and will be ignored. Instead, declare it as an instance method.',
        name,
      );
    }
    const state = instance.state;
    if (state && (typeof state !== 'object' || isArray(state))) {
      console.error('%s.state: must be set to an object or null', name);
    }
    if (
      typeof instance.getChildContext === 'function' &&
      typeof ctor.childContextTypes !== 'object'
    ) {
      console.error(
        '%s.getChildContext(): childContextTypes must be defined in order to ' +
          'use getChildContext().',
        name,
      );
    }
  }
}

function callComponentWillMount(type: any, instance: any) {
  const oldState = instance.state;

  if (typeof instance.componentWillMount === 'function') {
    if (__DEV__) {
      if (instance.componentWillMount.__suppressDeprecationWarning !== true) {
        const componentName = getComponentNameFromType(type) || 'Unknown';

        if (!didWarnAboutDeprecatedWillMount[componentName]) {
          console.warn(
            // keep this warning in sync with ReactStrictModeWarning.js
            'componentWillMount has been renamed, and is not recommended for use. ' +
              'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
              '* Move code from componentWillMount to componentDidMount (preferred in most cases) ' +
              'or the constructor.\n' +
              '\nPlease update the following components: %s',
            componentName,
          );
          didWarnAboutDeprecatedWillMount[componentName] = true;
        }
      }
    }

    instance.componentWillMount();
  }
  if (typeof instance.UNSAFE_componentWillMount === 'function') {
    instance.UNSAFE_componentWillMount();
  }

  if (oldState !== instance.state) {
    if (__DEV__) {
      console.error(
        '%s.componentWillMount(): Assigning directly to this.state is ' +
          "deprecated (except inside a component's " +
          'constructor). Use setState instead.',
        getComponentNameFromType(type) || 'Component',
      );
    }
    classComponentUpdater.enqueueReplaceState(instance, instance.state, null);
  }
}

function processUpdateQueue(
  internalInstance: InternalInstance,
  inst: any,
  props: any,
  maskedLegacyContext: any,
): void {
  if (internalInstance.queue !== null && internalInstance.queue.length > 0) {
    const oldQueue = internalInstance.queue;
    const oldReplace = internalInstance.replace;
    internalInstance.queue = null;
    internalInstance.replace = false;

    if (oldReplace && oldQueue.length === 1) {
      inst.state = oldQueue[0];
    } else {
      let nextState = oldReplace ? oldQueue[0] : inst.state;
      let dontMutate = true;
      for (let i = oldReplace ? 1 : 0; i < oldQueue.length; i++) {
        const partial = oldQueue[i];
        const partialState =
          typeof partial === 'function'
            ? partial.call(inst, nextState, props, maskedLegacyContext)
            : partial;
        if (partialState != null) {
          if (dontMutate) {
            dontMutate = false;
            nextState = assign({}, nextState, partialState);
          } else {
            assign(nextState, partialState);
          }
        }
      }
      inst.state = nextState;
    }
  } else {
    internalInstance.queue = null;
  }
}

// Invokes the mount life-cycles on a previously never rendered instance.
export function mountClassInstance(
  instance: any,
  ctor: any,
  newProps: any,
  maskedLegacyContext: any,
): void {
  if (__DEV__) {
    checkClassInstance(instance, ctor, newProps);
  }

  const initialState = instance.state !== undefined ? instance.state : null;

  instance.updater = classComponentUpdater;
  instance.props = newProps;
  instance.state = initialState;
  // We don't bother initializing the refs object on the server, since we're not going to resolve them anyway.

  // The internal instance will be used to manage updates that happen during this mount.
  const internalInstance: InternalInstance = {
    queue: [],
    replace: false,
  };
  setInstance(instance, internalInstance);

  const contextType = ctor.contextType;
  if (typeof contextType === 'object' && contextType !== null) {
    instance.context = readContext(contextType);
  } else if (disableLegacyContext) {
    instance.context = emptyContextObject;
  } else {
    instance.context = maskedLegacyContext;
  }

  if (__DEV__) {
    if (instance.state === newProps) {
      const componentName = getComponentNameFromType(ctor) || 'Component';
      if (!didWarnAboutDirectlyAssigningPropsToState.has(componentName)) {
        didWarnAboutDirectlyAssigningPropsToState.add(componentName);
        console.error(
          '%s: It is not recommended to assign props directly to state ' +
            "because updates to props won't be reflected in state. " +
            'In most cases, it is better to use props directly.',
          componentName,
        );
      }
    }
  }

  const getDerivedStateFromProps = ctor.getDerivedStateFromProps;
  if (typeof getDerivedStateFromProps === 'function') {
    instance.state = applyDerivedStateFromProps(
      instance,
      ctor,
      getDerivedStateFromProps,
      initialState,
      newProps,
    );
  }

  // In order to support react-lifecycles-compat polyfilled components,
  // Unsafe lifecycles should not be invoked for components using the new APIs.
  if (
    typeof ctor.getDerivedStateFromProps !== 'function' &&
    typeof instance.getSnapshotBeforeUpdate !== 'function' &&
    (typeof instance.UNSAFE_componentWillMount === 'function' ||
      typeof instance.componentWillMount === 'function')
  ) {
    callComponentWillMount(ctor, instance);
    // If we had additional state updates during this life-cycle, let's
    // process them now.
    processUpdateQueue(
      internalInstance,
      instance,
      newProps,
      maskedLegacyContext,
    );
  }
}
