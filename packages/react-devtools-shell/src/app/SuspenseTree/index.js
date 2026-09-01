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
  Fragment,
  Suspense,
  unstable_SuspenseList as SuspenseList,
  useReducer,
  useState,
} from 'react';

function SuspenseTree(): React.Node {
  return (
    <Fragment>
      <h1>Suspense</h1>
      <h4>Primary to Fallback Cycle</h4>
      <PrimaryFallbackTest initialSuspend={false} />
      <h4>Fallback to Primary Cycle</h4>
      <PrimaryFallbackTest initialSuspend={true} />
      <NestedSuspenseTest />
      <SuspenseListTest />
      <EmptySuspense />
      <SuspenseTreeOperations />
    </Fragment>
  );
}

function IgnoreMePassthrough({children}: {children: React$Node}) {
  return <span>{children}</span>;
}

const suspenseTreeOperationsChildren = {
  a: (
    <Suspense key="a" name="a">
      <p>A</p>
    </Suspense>
  ),
  b: (
    <div key="b">
      <Suspense name="b">B</Suspense>
    </div>
  ),
  c: (
    <p key="c">
      <Suspense key="c" name="c">
        C
      </Suspense>
    </p>
  ),
  d: (
    <Suspense key="d" name="d">
      <div>D</div>
    </Suspense>
  ),
  e: (
    <Suspense key="e" name="e">
      <IgnoreMePassthrough key="e1">
        <Suspense name="e-child-one">
          <p>e1</p>
        </Suspense>
      </IgnoreMePassthrough>
      <IgnoreMePassthrough key="e2">
        <Suspense name="e-child-two">
          <div>e2</div>
        </Suspense>
      </IgnoreMePassthrough>
    </Suspense>
  ),
  eReordered: (
    <Suspense key="e" name="e">
      <IgnoreMePassthrough key="e2">
        <Suspense name="e-child-two">
          <div>e2</div>
        </Suspense>
      </IgnoreMePassthrough>
      <IgnoreMePassthrough key="e1">
        <Suspense name="e-child-one">
          <p>e1</p>
        </Suspense>
      </IgnoreMePassthrough>
    </Suspense>
  ),
};

function SuspenseTreeOperations() {
  const initialChildren: any[] = [
    suspenseTreeOperationsChildren.a,
    suspenseTreeOperationsChildren.b,
    suspenseTreeOperationsChildren.c,
    suspenseTreeOperationsChildren.d,
    suspenseTreeOperationsChildren.e,
  ];
  const [children, dispatch] = useReducer(
    (
      pendingState: any[],
      action: 'toggle-mount' | 'reorder' | 'reorder-within-filtered',
    ): React$Node[] => {
      switch (action) {
        case 'toggle-mount':
          if (pendingState.length === 5) {
            return [
              suspenseTreeOperationsChildren.a,
              suspenseTreeOperationsChildren.b,
              suspenseTreeOperationsChildren.c,
              suspenseTreeOperationsChildren.d,
            ];
          } else {
            return [
              suspenseTreeOperationsChildren.a,
              suspenseTreeOperationsChildren.b,
              suspenseTreeOperationsChildren.c,
              suspenseTreeOperationsChildren.d,
              suspenseTreeOperationsChildren.e,
            ];
          }
        case 'reorder':
          if (pendingState[1] === suspenseTreeOperationsChildren.b) {
            return [
              suspenseTreeOperationsChildren.a,
              suspenseTreeOperationsChildren.c,
              suspenseTreeOperationsChildren.b,
              suspenseTreeOperationsChildren.d,
              suspenseTreeOperationsChildren.e,
            ];
          } else {
            return [
              suspenseTreeOperationsChildren.a,
              suspenseTreeOperationsChildren.b,
              suspenseTreeOperationsChildren.c,
              suspenseTreeOperationsChildren.d,
              suspenseTreeOperationsChildren.e,
            ];
          }
        case 'reorder-within-filtered':
          if (pendingState[4] === suspenseTreeOperationsChildren.e) {
            return [
              suspenseTreeOperationsChildren.a,
              suspenseTreeOperationsChildren.b,
              suspenseTreeOperationsChildren.c,
              suspenseTreeOperationsChildren.d,
              suspenseTreeOperationsChildren.eReordered,
            ];
          } else {
            return [
              suspenseTreeOperationsChildren.a,
              suspenseTreeOperationsChildren.b,
              suspenseTreeOperationsChildren.c,
              suspenseTreeOperationsChildren.d,
              suspenseTreeOperationsChildren.e,
            ];
          }
        default:
          return pendingState;
      }
    },
    initialChildren,
  );

  return (
    <>
      <button onClick={() => dispatch('toggle-mount')}>Toggle Mount</button>
      <button onClick={() => dispatch('reorder')}>Reorder</button>
      <button onClick={() => dispatch('reorder-within-filtered')}>
        Reorder Within Filtered
      </button>
      <Suspense name="operations-parent">
        <section>{children}</section>
      </Suspense>
    </>
  );
}

function EmptySuspense() {
  return <Suspense />;
}

// $FlowFixMe[missing-local-annot]
function PrimaryFallbackTest({initialSuspend}) {
  const [suspend, setSuspend] = useState(initialSuspend);
  const [fallbackStepIndex, fallbackStep] = useTestSequence(
    'fallback',
    Fallback1,
    Fallback2,
  );
  const [, primaryStep] = useTestSequence('primary', Primary1, Primary2);
  return (
    <Fragment>
      <label>
        <input
          checked={suspend}
          onChange={e => setSuspend(e.target.checked)}
          type="checkbox"
        />
        Suspend
      </label>
      <br />
      <Suspense fallback={fallbackStep}>
        {suspend ? (
          <Never id={`primary-fallback-test-${fallbackStepIndex}`} />
        ) : (
          primaryStep
        )}
      </Suspense>
    </Fragment>
  );
}

function useTestSequence(label: string, T1: any => any, T2: any => any) {
  const [step, setStep] = useState(0);
  const next: $FlowFixMe = (
    <button onClick={() => setStep(s => (s + 1) % allSteps.length)}>
      next {label} content
    </button>
  );
  const allSteps: $FlowFixMe = [
    <Fragment>{next}</Fragment>,
    <Fragment>
      {next} <T1 prop={step}>mount</T1>
    </Fragment>,
    <Fragment>
      {next} <T1 prop={step}>update</T1>
    </Fragment>,
    <Fragment>
      {next} <T2 prop={step}>several</T2> <T1 prop={step}>different</T1>{' '}
      <T2 prop={step}>children</T2>
    </Fragment>,
    <Fragment>
      {next} <T2 prop={step}>goodbye</T2>
    </Fragment>,
  ];
  return [step, allSteps[step]];
}

function NestedSuspenseTest() {
  return (
    <Fragment>
      <h3>Nested Suspense</h3>
      <Suspense fallback={<Fallback1>Loading outer</Fallback1>}>
        <Parent />
      </Suspense>
    </Fragment>
  );
}

function Parent() {
  return (
    <div>
      <Suspense fallback={<Fallback1>Loading inner 1</Fallback1>}>
        <Primary1>Hello</Primary1>
      </Suspense>{' '}
      <Suspense fallback={<Fallback2>Loading inner 2</Fallback2>}>
        <Primary2>World</Primary2>
      </Suspense>
      <br />
      <Suspense fallback={<Fallback1>This will never load</Fallback1>}>
        <Never id="parent-never" />
      </Suspense>
      <br />
      <b>
        <LoadLater />
      </b>
    </div>
  );
}

function SuspenseListTest() {
  return (
    <>
      <h1>SuspenseList</h1>
      <SuspenseList revealOrder="forwards" tail="collapsed">
        <div>
          <Suspense fallback={<Fallback1>Loading 1</Fallback1>}>
            <Primary1>Hello</Primary1>
          </Suspense>
        </div>
        <div>
          <LoadLater />
        </div>
        <div>
          <Suspense fallback={<Fallback2>Loading 2</Fallback2>}>
            <Primary2>World</Primary2>
          </Suspense>
        </div>
      </SuspenseList>
    </>
  );
}

function LoadLater() {
  const [loadChild, setLoadChild] = useState(false);
  return (
    <Suspense
      fallback={
        <Fallback1 onClick={() => setLoadChild(true)}>Click to load</Fallback1>
      }
      name="LoadLater">
      {loadChild ? (
        <Primary1 onClick={() => setLoadChild(false)}>
          Loaded! Click to suspend again.
        </Primary1>
      ) : (
        <Never id="load-later" />
      )}
    </Suspense>
  );
}

function readRecord(promise: any): any {
  if (typeof React.use === 'function') {
    // eslint-disable-next-line react-hooks-published/rules-of-hooks
    return React.use(promise);
  }
  switch (promise.status) {
    case 'pending':
      throw promise;
    case 'rejected':
      throw promise.reason;
    case 'fulfilled':
      return promise.value;
    default:
      promise.status = 'pending';
      promise.then(
        value => {
          promise.status = 'fulfilled';
          promise.value = value;
        },
        reason => {
          promise.status = 'rejected';
          promise.reason = reason;
        },
      );
      throw promise;
  }
}

const nevers = new Map<string, Promise<empty>>();
function Never({id}: {id: string}) {
  let promise = nevers.get(id);
  if (!promise) {
    promise = new Promise(() => {});
    (promise as any).displayName = id;
    nevers.set(id, promise);
  }
  readRecord(promise);
}

function Fallback1({prop, ...rest}: any) {
  return <span {...rest} />;
}

function Fallback2({prop, ...rest}: any) {
  return <span {...rest} />;
}

function Primary1({prop, ...rest}: any) {
  return <span {...rest} />;
}

function Primary2({prop, ...rest}: any) {
  return <span {...rest} />;
}

export default SuspenseTree;
