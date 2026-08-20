/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let React;
let ReactDOM;
let ReactIs;
let SuspenseList;

describe('ReactIs', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactDOM = require('react-dom');
    ReactIs = require('react-is');

    if (gate(flags => flags.enableSuspenseList)) {
      SuspenseList = React.unstable_SuspenseList;
    }
  });

  it('should return undefined for unknown/invalid types', () => {
    expect(ReactIs.typeOf('abc')).toBe(undefined);
    expect(ReactIs.typeOf(true)).toBe(undefined);
    expect(ReactIs.typeOf(123)).toBe(undefined);
    expect(ReactIs.typeOf({})).toBe(undefined);
    expect(ReactIs.typeOf(null)).toBe(undefined);
    expect(ReactIs.typeOf(undefined)).toBe(undefined);
    expect(ReactIs.typeOf(NaN)).toBe(undefined);
    expect(ReactIs.typeOf(Symbol('def'))).toBe(undefined);
  });

  it('identifies valid element types', () => {
    class Component extends React.Component {
      render() {
        return React.createElement('div');
      }
    }
    class PureComponent extends React.PureComponent {
      render() {
        return React.createElement('div');
      }
    }

    const FunctionComponent = () => React.createElement('div');
    const ForwardRefComponent = React.forwardRef((props, ref) =>
      React.createElement(Component, {forwardedRef: ref, ...props}),
    );
    const LazyComponent = React.lazy(() => Component);
    const MemoComponent = React.memo(Component);
    const Context = React.createContext(false);

    expect(ReactIs.isValidElementType('div')).toEqual(true);
    expect(ReactIs.isValidElementType(Component)).toEqual(true);
    expect(ReactIs.isValidElementType(PureComponent)).toEqual(true);
    expect(ReactIs.isValidElementType(FunctionComponent)).toEqual(true);
    expect(ReactIs.isValidElementType(ForwardRefComponent)).toEqual(true);
    expect(ReactIs.isValidElementType(LazyComponent)).toEqual(true);
    expect(ReactIs.isValidElementType(MemoComponent)).toEqual(true);
    expect(ReactIs.isValidElementType(Context.Provider)).toEqual(true);
    expect(ReactIs.isValidElementType(Context.Consumer)).toEqual(true);
    expect(ReactIs.isValidElementType(React.Fragment)).toEqual(true);
    expect(ReactIs.isValidElementType(React.StrictMode)).toEqual(true);
    expect(ReactIs.isValidElementType(React.Suspense)).toEqual(true);

    expect(ReactIs.isValidElementType(true)).toEqual(false);
    expect(ReactIs.isValidElementType(123)).toEqual(false);
    expect(ReactIs.isValidElementType({})).toEqual(false);
    expect(ReactIs.isValidElementType(null)).toEqual(false);
    expect(ReactIs.isValidElementType(undefined)).toEqual(false);
    expect(ReactIs.isValidElementType({type: 'div', props: {}})).toEqual(false);
  });

  it('should identify context consumers', () => {
    const Context = React.createContext(false);
    expect(ReactIs.isValidElementType(Context.Consumer)).toBe(true);
    expect(ReactIs.typeOf(<Context.Consumer />)).toBe(ReactIs.ContextConsumer);
    expect(ReactIs.isContextConsumer(<Context.Consumer />)).toBe(true);
    expect(ReactIs.isContextConsumer(<Context.Provider />)).toBe(false);
    expect(ReactIs.isContextConsumer(<div />)).toBe(false);
  });

  it('should identify context providers', () => {
    const Context = React.createContext(false);
    expect(ReactIs.isValidElementType(Context.Provider)).toBe(true);
    expect(ReactIs.typeOf(<Context.Provider />)).toBe(ReactIs.ContextProvider);
    expect(ReactIs.isContextProvider(<Context.Provider />)).toBe(true);
    expect(ReactIs.isContextProvider(<Context.Consumer />)).toBe(false);
    expect(ReactIs.isContextProvider(<div />)).toBe(false);
  });

  it('should identify elements', () => {
    expect(ReactIs.typeOf(<div />)).toBe(ReactIs.Element);
    expect(ReactIs.isElement(<div />)).toBe(true);
    expect(ReactIs.isElement('div')).toBe(false);
    expect(ReactIs.isElement(true)).toBe(false);
    expect(ReactIs.isElement(123)).toBe(false);
    expect(ReactIs.isElement(null)).toBe(false);
    expect(ReactIs.isElement(undefined)).toBe(false);
    expect(ReactIs.isElement({})).toBe(false);

    // It should also identify more specific types as elements
    const Context = React.createContext(false);
    expect(ReactIs.isElement(<Context.Provider />)).toBe(true);
    expect(ReactIs.isElement(<Context.Consumer />)).toBe(true);
    expect(ReactIs.isElement(<React.Fragment />)).toBe(true);
    expect(ReactIs.isElement(<React.StrictMode />)).toBe(true);
    expect(ReactIs.isElement(<React.Suspense />)).toBe(true);
  });

  it('should identify ref forwarding component', () => {
    const RefForwardingComponent = React.forwardRef((props, ref) => null);
    expect(ReactIs.isValidElementType(RefForwardingComponent)).toBe(true);
    expect(ReactIs.typeOf(<RefForwardingComponent />)).toBe(ReactIs.ForwardRef);
    expect(ReactIs.isForwardRef(<RefForwardingComponent />)).toBe(true);
    expect(ReactIs.isForwardRef({type: ReactIs.StrictMode})).toBe(false);
    expect(ReactIs.isForwardRef(<div />)).toBe(false);
  });

  it('should identify fragments', () => {
    expect(ReactIs.isValidElementType(React.Fragment)).toBe(true);
    expect(ReactIs.typeOf(<React.Fragment />)).toBe(ReactIs.Fragment);
    expect(ReactIs.isFragment(<React.Fragment />)).toBe(true);
    expect(ReactIs.isFragment({type: ReactIs.Fragment})).toBe(false);
    expect(ReactIs.isFragment('React.Fragment')).toBe(false);
    expect(ReactIs.isFragment(<div />)).toBe(false);
    expect(ReactIs.isFragment([])).toBe(false);
  });

  it('should identify portals', () => {
    const div = document.createElement('div');
    const portal = ReactDOM.createPortal(<div />, div);
    expect(ReactIs.isValidElementType(portal)).toBe(false);
    expect(ReactIs.typeOf(portal)).toBe(ReactIs.Portal);
    expect(ReactIs.isPortal(portal)).toBe(true);
    expect(ReactIs.isPortal(div)).toBe(false);
  });

  it('should identify memo', () => {
    const Component = () => React.createElement('div');
    const Memoized = React.memo(Component);
    expect(ReactIs.isValidElementType(Memoized)).toBe(true);
    expect(ReactIs.typeOf(<Memoized />)).toBe(ReactIs.Memo);
    expect(ReactIs.isMemo(<Memoized />)).toBe(true);
    expect(ReactIs.isMemo(<Component />)).toBe(false);
  });

  it('should identify lazy', () => {
    const Component = () => React.createElement('div');
    const LazyComponent = React.lazy(() => Component);
    expect(ReactIs.isValidElementType(LazyComponent)).toBe(true);
    expect(ReactIs.typeOf(<LazyComponent />)).toBe(ReactIs.Lazy);
    expect(ReactIs.isLazy(<LazyComponent />)).toBe(true);
    expect(ReactIs.isLazy(<Component />)).toBe(false);
  });

  it('should identify strict mode', () => {
    expect(ReactIs.isValidElementType(React.StrictMode)).toBe(true);
    expect(ReactIs.typeOf(<React.StrictMode />)).toBe(ReactIs.StrictMode);
    expect(ReactIs.isStrictMode(<React.StrictMode />)).toBe(true);
    expect(ReactIs.isStrictMode({type: ReactIs.StrictMode})).toBe(false);
    expect(ReactIs.isStrictMode(<div />)).toBe(false);
  });

  it('should identify suspense', () => {
    expect(ReactIs.isValidElementType(React.Suspense)).toBe(true);
    expect(ReactIs.typeOf(<React.Suspense />)).toBe(ReactIs.Suspense);
    expect(ReactIs.isSuspense(<React.Suspense />)).toBe(true);
    expect(ReactIs.isSuspense({type: ReactIs.Suspense})).toBe(false);
    expect(ReactIs.isSuspense('React.Suspense')).toBe(false);
    expect(ReactIs.isSuspense(<div />)).toBe(false);
  });

  // @gate enableSuspenseList
  it('should identify suspense list', () => {
    expect(ReactIs.isValidElementType(SuspenseList)).toBe(true);
    expect(ReactIs.typeOf(<SuspenseList />)).toBe(ReactIs.SuspenseList);
    expect(ReactIs.isSuspenseList(<SuspenseList />)).toBe(true);
    expect(ReactIs.isSuspenseList({type: ReactIs.SuspenseList})).toBe(false);
    expect(ReactIs.isSuspenseList('React.SuspenseList')).toBe(false);
    expect(ReactIs.isSuspenseList(<div />)).toBe(false);
  });

  it('should identify profile root', () => {
    expect(ReactIs.isValidElementType(React.Profiler)).toBe(true);
    expect(
      ReactIs.typeOf(<React.Profiler id="foo" onRender={jest.fn()} />),
    ).toBe(ReactIs.Profiler);
    expect(
      ReactIs.isProfiler(<React.Profiler id="foo" onRender={jest.fn()} />),
    ).toBe(true);
    expect(ReactIs.isProfiler({type: ReactIs.Profiler})).toBe(false);
    expect(ReactIs.isProfiler(<div />)).toBe(false);
  });
});
