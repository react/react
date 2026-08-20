/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {Fragment, useDebugValue, useState} from 'react';

const div = document.createElement('div');
const exampleFunction = () => {};
const typedArray = new Uint8Array(3);
typedArray[0] = 1;
typedArray[1] = 2;
typedArray[2] = 3;

const arrayOfArrays = [
  [
    ['a', 'b', 'c'],
    ['d', 'e', 'f'],
    ['h', 'i', 'j'],
  ],
  [
    ['k', 'l', 'm'],
    ['n', 'o', 'p'],
    ['q', 'r', 's'],
  ],
  [['t', 'u', 'v'], ['w', 'x', 'y'], ['z']],
  [],
];

const objectOfObjects = {
  foo: {
    a: 1,
    b: 2,
    c: 3,
  },
  bar: {
    e: 4,
    f: 5,
    g: 6,
  },
  baz: {
    h: 7,
    i: 8,
    j: 9,
  },
  qux: {},
  quux: {
    k: undefined,
    l: null,
  },
};

function useOuterFoo() {
  useDebugValue({
    debugA: {
      debugB: {
        debugC: 'abc',
      },
    },
  });
  useState({
    valueA: {
      valueB: {
        valueC: 'abc',
      },
    },
  });
  return useInnerFoo();
}

function useInnerFoo() {
  const [value] = useState([[['a', 'b', 'c']]]);
  return value;
}

function useOuterBar() {
  useDebugValue({
    debugA: {
      debugB: {
        debugC: 'abc',
      },
    },
  });
  return useInnerBar();
}

function useInnerBar() {
  useDebugValue({
    debugA: {
      debugB: {
        debugC: 'abc',
      },
    },
  });
  const [count] = useState(123);
  return count;
}

function useOuterBaz() {
  return useInnerBaz();
}

function useInnerBaz() {
  const [count] = useState(123);
  return count;
}

const unusedPromise = Promise.resolve();
const usedFulfilledPromise = Promise.resolve();
const usedFulfilledRichPromise = Promise.resolve({
  some: {
    deeply: {
      nested: {
        object: {
          string: 'test',
          fn: () => {},
        },
      },
    },
  },
});
const usedPendingPromise = new Promise(resolve => {});
const usedRejectedPromise = Promise.reject(
  // eslint-disable-next-line react-internal/prod-error-codes
  new Error('test-error-do-not-surface'),
);

class DigestError extends Error {
  digest: string;
  constructor(message: string, options: any, digest: string) {
    super(message, options);
    this.digest = digest;
  }
}

export default function Hydration(): React.Node {
  return (
    <Fragment>
      <h1>Hydration</h1>
      <DehydratableProps
        html_element={div}
        fn={exampleFunction}
        symbol={Symbol('symbol')}
        react_element={<span />}
        array_buffer={typedArray.buffer}
        typed_array={typedArray}
        date={new Date()}
        array={arrayOfArrays}
        object={objectOfObjects}
        unusedPromise={unusedPromise}
        usedFulfilledPromise={usedFulfilledPromise}
        usedFulfilledRichPromise={usedFulfilledRichPromise}
        usedPendingPromise={usedPendingPromise}
        usedRejectedPromise={usedRejectedPromise}
        // eslint-disable-next-line react-internal/prod-error-codes
        error={new Error('test')}
        // eslint-disable-next-line react-internal/prod-error-codes
        errorWithCause={new Error('one', {cause: new TypeError('two')})}
        errorWithDigest={new DigestError('test', {}, 'some-digest')}
        // $FlowFixMe[cannot-resolve-name] Flow doesn't know about DOMException
        domexception={new DOMException('test')}
      />
      <DeepHooks />
    </Fragment>
  );
}

function Use({value}: {value: Promise<mixed>}): React.Node {
  React.use(value);
  return null;
}

class IgnoreErrors extends React.Component {
  state: {hasError: boolean} = {hasError: false};
  static getDerivedStateFromError(): {hasError: boolean} {
    return {hasError: true};
  }

  render(): React.Node {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

function DehydratableProps({array, object}: any) {
  return (
    <ul>
      <li>array: {JSON.stringify(array, null, 2)}</li>
      <li>object: {JSON.stringify(object, null, 2)}</li>
      <React.Suspense>
        <Use value={usedPendingPromise} />
      </React.Suspense>
      <React.Suspense>
        <Use value={usedFulfilledPromise} />
      </React.Suspense>
      <React.Suspense>
        <Use value={usedFulfilledRichPromise} />
      </React.Suspense>
      <IgnoreErrors>
        <React.Suspense>
          <Use value={usedRejectedPromise} />
        </React.Suspense>
      </IgnoreErrors>
    </ul>
  );
}

function DeepHooks(props: any) {
  const foo = useOuterFoo();
  const bar = useOuterBar();
  const baz = useOuterBaz();
  return (
    <ul>
      <li>foo: {foo}</li>
      <li>bar: {bar}</li>
      <li>baz: {baz}</li>
    </ul>
  );
}
