/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {
  createContext,
  forwardRef,
  lazy,
  memo,
  Component,
  Fragment,
  Profiler,
  StrictMode,
  Suspense,
} from 'react';

const Context = createContext('abc');
Context.displayName = 'ExampleContext';

class ClassComponent extends Component<any> {
  render(): null {
    return null;
  }
}

function FunctionComponent() {
  return null;
}

const MemoFunctionComponent = memo(FunctionComponent);

const ForwardRefComponentWithAnonymousFunction = forwardRef((props, ref) => (
  <ClassComponent ref={ref} {...props} />
));
const ForwardRefComponent = forwardRef(function NamedInnerFunction(props, ref) {
  return <ClassComponent ref={ref} {...props} />;
});
const ForwardRefComponentWithCustomDisplayName = forwardRef((props, ref) => (
  <ClassComponent ref={ref} {...props} />
));
ForwardRefComponentWithCustomDisplayName.displayName = 'Custom';

const LazyComponent = lazy(() =>
  Promise.resolve({
    default: FunctionComponent,
  }),
);

export default function ElementTypes(): React.Node {
  return (
    <Profiler id="test" onRender={() => {}}>
      <Fragment>
        <Context.Provider value={'def'}>
          <Context.Consumer>{(value: $FlowFixMe) => null}</Context.Consumer>
        </Context.Provider>
        <StrictMode>
          <Suspense fallback={<div>Loading...</div>}>
            <ClassComponent />
            <FunctionComponent />
            <MemoFunctionComponent />
            <ForwardRefComponent />
            <ForwardRefComponentWithAnonymousFunction />
            <ForwardRefComponentWithCustomDisplayName />
            <LazyComponent />
          </Suspense>
        </StrictMode>
      </Fragment>
    </Profiler>
  );
}
