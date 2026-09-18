# Owned Host Context Stage 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow `useFormStatus()` to observe a single `<form>` directly returned by the same function component, while preserving existing descendant form status behavior.

**Architecture:** Add an internal owned-host-status dependency list to function component update queues. During render, `useHostTransitionStatus()` records a dependency when no parent host transition is active. During host reconciliation, a directly owned `<form>` binds that dependency to the form host fiber, and form status changes schedule the owner fiber.

**Tech Stack:** React Fiber reconciler, React DOM form actions, Flow, Jest source tests, React internal Scheduler test utils.

---

## File Structure

- Modify `packages/react-dom/src/__tests__/ReactDOMForm-test.js`
  - Adds regression coverage for same-component `useFormStatus`.
  - Adds ambiguity coverage for multiple directly owned forms.
- Modify `packages/react-reconciler/src/ReactFiberHooks.js`
  - Extends `FunctionComponentUpdateQueue`.
  - Records owned host status requests from `useHostTransitionStatus`.
  - Exports helpers used by begin work to bind and schedule owner dependencies.
- Modify `packages/react-reconciler/src/ReactFiberBeginWork.js`
  - Binds owned form status dependencies while reconciling direct children returned by a function component.
  - Schedules owner fibers when a bound form status changes.
This plan intentionally does not add the explicit scope token API. That belongs in Stage 2 after the implicit single-form behavior lands.

---

### Task 1: Add Failing Same-Component Form Status Test

**Files:**
- Modify: `packages/react-dom/src/__tests__/ReactDOMForm-test.js`

- [x] **Step 1: Add the failing regression test**

Insert this test after the existing `useFormStatus reads the status of a pending form action` test.

```js
  it('useFormStatus can read the status of a form returned by the same component', async () => {
    const formRef = React.createRef();

    async function myAction() {
      Scheduler.log('Async action started');
      await getText('Wait');
      Scheduler.log('Async action finished');
    }

    function App() {
      const {pending, data, action, method} = useFormStatus();
      let status;
      if (!pending) {
        status = 'No pending action';
      } else {
        status = `Pending action ${action.name}: foo is ${data.get(
          'foo',
        )}, method is ${method}`;
      }

      return (
        <form action={myAction} ref={formRef}>
          <input type="text" name="foo" defaultValue="bar" />
          <Text text={status} />
        </form>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App />));
    assertLog(['No pending action']);
    expect(container.textContent).toBe('No pending action');

    await submit(formRef.current);
    assertLog([
      'Async action started',
      'Pending action myAction: foo is bar, method is get',
    ]);
    expect(container.textContent).toBe(
      'Pending action myAction: foo is bar, method is get',
    );

    await act(() => resolveText('Wait'));
    assertLog(['Async action finished', 'No pending action']);
    expect(container.textContent).toBe('No pending action');
  });
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
yarn test ReactDOMForm-test --runInBand
```

Expected: this new test fails because `useFormStatus()` returns `NotPending` in `App` while the form action is pending.

- [x] **Step 3: Commit the failing test**

```bash
git add packages/react-dom/src/__tests__/ReactDOMForm-test.js
git commit -m "test: add same component form status coverage"
```

---

### Task 2: Add Owned Host Status Dependency Storage

**Files:**
- Modify: `packages/react-reconciler/src/ReactFiberHooks.js`

- [x] **Step 1: Add dependency types**

Near `FunctionComponentUpdateQueue`, add:

```js
export type OwnedHostTransitionStatusDependency = {
  kind: 'form',
  owner: Fiber,
  provider: Fiber | null,
  value: TransitionStatus,
  ambiguous: boolean,
};
```

Then extend `FunctionComponentUpdateQueue`:

```js
export type FunctionComponentUpdateQueue = {
  lastEffect: Effect | null,
  events: Array<EventFunctionPayload<any, any, any>> | null,
  stores: Array<StoreConsistencyCheck<any>> | null,
  memoCache: MemoCache | null,
  ownedHostTransitionStatus:
    | Array<OwnedHostTransitionStatusDependency>
    | null,
};
```

- [x] **Step 2: Initialize and reset the dependency list**

Update `createFunctionComponentUpdateQueue`:

```js
function createFunctionComponentUpdateQueue(): FunctionComponentUpdateQueue {
  return {
    lastEffect: null,
    events: null,
    stores: null,
    memoCache: null,
    ownedHostTransitionStatus: null,
  };
}
```

Update `resetFunctionComponentUpdateQueue`:

```js
function resetFunctionComponentUpdateQueue(
  updateQueue: FunctionComponentUpdateQueue,
): void {
  updateQueue.lastEffect = null;
  updateQueue.events = null;
  updateQueue.stores = null;
  updateQueue.ownedHostTransitionStatus = null;
  if (updateQueue.memoCache != null) {
    updateQueue.memoCache.index = 0;
  }
}
```

- [x] **Step 3: Add helper to record a dependency**

Below `resetFunctionComponentUpdateQueue`, add:

```js
function recordOwnedHostTransitionStatusDependency(): TransitionStatus {
  let updateQueue: FunctionComponentUpdateQueue | null =
    currentlyRenderingFiber.updateQueue as any;
  if (updateQueue === null) {
    updateQueue = createFunctionComponentUpdateQueue();
    currentlyRenderingFiber.updateQueue = updateQueue as any;
  }

  const dependency: OwnedHostTransitionStatusDependency = {
    kind: 'form',
    owner: currentlyRenderingFiber,
    provider: null,
    value: NoPendingHostTransition,
    ambiguous: false,
  };

  if (updateQueue.ownedHostTransitionStatus === null) {
    updateQueue.ownedHostTransitionStatus = [dependency];
  } else {
    updateQueue.ownedHostTransitionStatus.push(dependency);
  }

  return NoPendingHostTransition;
}
```

- [x] **Step 4: Run Flow status for dom-node**

Run:

```bash
cp scripts/flow/dom-node/.flowconfig .flowconfig
./node_modules/.bin/flow status
```

Expected: Flow passes or reports only errors introduced by missing imports in this task.

- [x] **Step 5: Commit storage changes**

```bash
git add packages/react-reconciler/src/ReactFiberHooks.js
git commit -m "feat: track owned host status dependencies"
```

---

### Task 3: Record Dependencies from useHostTransitionStatus

**Files:**
- Modify: `packages/react-reconciler/src/ReactFiberHooks.js`

- [x] **Step 1: Change the hook implementation**

Replace:

```js
function useHostTransitionStatus(): TransitionStatus {
  return readContext(HostTransitionContext);
}
```

with:

```js
function useHostTransitionStatus(): TransitionStatus {
  const status = readContext(HostTransitionContext);
  if (status !== NoPendingHostTransition) {
    return status;
  }
  return recordOwnedHostTransitionStatusDependency();
}
```

- [x] **Step 2: Verify existing child behavior still passes**

Run:

```bash
yarn test ReactDOMForm-test --runInBand
```

Expected: existing child-component form status tests still pass; the new same-component test still fails because dependencies are not bound to forms yet.

- [x] **Step 3: Commit hook dependency recording**

```bash
git add packages/react-reconciler/src/ReactFiberHooks.js
git commit -m "feat: record owned form status reads"
```

---

### Task 4: Bind Dependencies to Directly Owned Forms

**Files:**
- Modify: `packages/react-reconciler/src/ReactFiberHooks.js`
- Modify: `packages/react-reconciler/src/ReactFiberBeginWork.js`

- [x] **Step 1: Export binding helpers from ReactFiberHooks**

Add these exports near the owned dependency helper code:

```js
export function bindOwnedHostTransitionStatusDependencies(
  owner: Fiber,
  provider: Fiber,
): void {
  const updateQueue: FunctionComponentUpdateQueue | null =
    owner.updateQueue as any;
  const dependencies =
    updateQueue !== null ? updateQueue.ownedHostTransitionStatus : null;
  if (dependencies === null) {
    return;
  }

  for (let i = 0; i < dependencies.length; i++) {
    const dependency = dependencies[i];
    if (dependency.kind !== 'form') {
      continue;
    }
    if (dependency.provider === null) {
      dependency.provider = provider;
      dependency.value = getTransitionStatusFromHostFiber(provider);
    } else if (dependency.provider !== provider) {
      dependency.ambiguous = true;
      dependency.provider = null;
      dependency.value = NoPendingHostTransition;
    }
  }
}

function getTransitionStatusFromHostFiber(provider: Fiber): TransitionStatus {
  const stateHook: Hook | null = provider.memoizedState;
  if (stateHook === null) {
    return NoPendingHostTransition;
  }
  return stateHook.memoizedState;
}
```

- [x] **Step 2: Add DEV warning helper**

In `ReactFiberHooks.js`, add:

```js
export function warnIfOwnedHostTransitionStatusIsAmbiguous(
  owner: Fiber,
): void {
  if (__DEV__) {
    const updateQueue: FunctionComponentUpdateQueue | null =
      owner.updateQueue as any;
    const dependencies =
      updateQueue !== null ? updateQueue.ownedHostTransitionStatus : null;
    if (dependencies === null) {
      return;
    }
    for (let i = 0; i < dependencies.length; i++) {
      if (dependencies[i].ambiguous) {
        console.error(
          'useFormStatus() was called in a component that returns multiple ' +
            '<form> elements. React cannot infer which form status to read. ' +
            'Move useFormStatus() into a child of the form, or use an explicit ' +
            'form scope when that API is available.',
        );
        return;
      }
    }
  }
}
```

- [x] **Step 3: Import helpers in ReactFiberBeginWork**

In `packages/react-reconciler/src/ReactFiberBeginWork.js`, extend the hooks import:

```js
import {
  renderTransitionAwareHostComponentWithHooks,
  bindOwnedHostTransitionStatusDependencies,
  warnIfOwnedHostTransitionStatusIsAmbiguous,
} from './ReactFiberHooks';
```

Keep existing imported names in that import block.

- [x] **Step 4: Add direct child binding helper in ReactFiberBeginWork**

Add this helper near `updateFunctionComponent` helpers:

```js
function bindOwnedHostTransitionStatusToDirectForms(
  owner: Fiber,
  child: Fiber | null,
): void {
  let node = child;
  while (node !== null) {
    if (node.tag === HostComponent && node.type === 'form') {
      bindOwnedHostTransitionStatusDependencies(owner, node);
    }
    node = node.sibling;
  }
  warnIfOwnedHostTransitionStatusIsAmbiguous(owner);
}
```

- [x] **Step 5: Call binding after function children are reconciled**

In `updateFunctionComponent`, immediately after:

```js
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
```

add:

```js
bindOwnedHostTransitionStatusToDirectForms(workInProgress, workInProgress.child);
```

Keep the existing `return workInProgress.child;` as the next statement.

- [x] **Step 6: Verify failure narrows to scheduling**

Run:

```bash
yarn test ReactDOMForm-test --runInBand
```

Expected: the new test may still fail on the pending update because the owner is not scheduled when the form status changes. Existing tests should continue passing.

- [x] **Step 7: Commit binding changes**

```bash
git add packages/react-reconciler/src/ReactFiberHooks.js packages/react-reconciler/src/ReactFiberBeginWork.js
git commit -m "feat: bind owned form status dependencies"
```

---

### Task 5: Schedule Owners When Form Status Changes

**Files:**
- Modify: `packages/react-reconciler/src/ReactFiberHooks.js`
- Modify: `packages/react-reconciler/src/ReactFiberBeginWork.js`

- [x] **Step 1: Export a scheduler helper**

In `ReactFiberHooks.js`, add:

```js
export function markOwnedHostTransitionStatusChanged(
  provider: Fiber,
  newState: TransitionStatus,
  renderLanes: Lanes,
): void {
  let owner = provider.return;
  while (owner !== null) {
    const updateQueue: FunctionComponentUpdateQueue | null =
      owner.updateQueue as any;
    const dependencies =
      updateQueue !== null ? updateQueue.ownedHostTransitionStatus : null;
    if (dependencies !== null) {
      for (let i = 0; i < dependencies.length; i++) {
        const dependency = dependencies[i];
        if (dependency.provider === provider && dependency.value !== newState) {
          dependency.value = newState;
          owner.lanes = mergeLanes(owner.lanes, renderLanes);
          const alternate = owner.alternate;
          if (alternate !== null) {
            alternate.lanes = mergeLanes(alternate.lanes, renderLanes);
          }
          scheduleOwnedHostTransitionStatusWorkOnParentPath(
            owner.return,
            renderLanes,
          );
        }
      }
    }
    owner = owner.return;
  }
}

function scheduleOwnedHostTransitionStatusWorkOnParentPath(
  parent: Fiber | null,
  renderLanes: Lanes,
): void {
  let node = parent;
  while (node !== null) {
    const alternate = node.alternate;
    if (!isSubsetOfLanes(node.childLanes, renderLanes)) {
      node.childLanes = mergeLanes(node.childLanes, renderLanes);
      if (alternate !== null) {
        alternate.childLanes = mergeLanes(alternate.childLanes, renderLanes);
      }
    } else if (
      alternate !== null &&
      !isSubsetOfLanes(alternate.childLanes, renderLanes)
    ) {
      alternate.childLanes = mergeLanes(alternate.childLanes, renderLanes);
    }
    node = node.return;
  }
}
```

`ReactFiberHooks.js` already imports `mergeLanes` and `isSubsetOfLanes` from `ReactFiberLane`; keep those imports in place.

- [x] **Step 2: Import scheduler helper in ReactFiberBeginWork**

```js
import {
  renderTransitionAwareHostComponentWithHooks,
  bindOwnedHostTransitionStatusDependencies,
  markOwnedHostTransitionStatusChanged,
  warnIfOwnedHostTransitionStatusIsAmbiguous,
} from './ReactFiberHooks';
```

- [x] **Step 3: Call scheduler helper when host transition state changes**

In `updateHostComponent`, after `newState` is computed and before writing `HostTransitionContext`, add:

```js
    const oldState =
      current !== null && current.memoizedState !== null
        ? current.memoizedState.memoizedState
        : NotPendingTransition;
    if (oldState !== newState) {
      markOwnedHostTransitionStatusChanged(
        workInProgress,
        newState,
        renderLanes,
      );
    }
```

Keep the existing `HostTransitionContext._currentValue = newState` logic unchanged.

- [x] **Step 4: Run same-component test**

Run:

```bash
yarn test ReactDOMForm-test --runInBand
```

Expected: the new same-component test passes. Existing tests in `ReactDOMForm-test` pass.

- [x] **Step 5: Commit scheduling changes**

```bash
git add packages/react-reconciler/src/ReactFiberHooks.js packages/react-reconciler/src/ReactFiberBeginWork.js
git commit -m "feat: schedule owned form status readers"
```

---

### Task 6: Add Ambiguity Test

**Files:**
- Modify: `packages/react-dom/src/__tests__/ReactDOMForm-test.js`

- [x] **Step 1: Add multi-form ambiguity test**

Insert this test near the same-component test:

```js
  it('useFormStatus returns not pending for ambiguous same-component forms', async () => {
    const firstFormRef = React.createRef();
    const secondFormRef = React.createRef();

    async function firstAction() {
      Scheduler.log('First action started');
      await getText('First');
    }

    async function secondAction() {
      Scheduler.log('Second action started');
      await getText('Second');
    }

    function App() {
      const {pending} = useFormStatus();
      return (
        <>
          <form action={firstAction} ref={firstFormRef}>
            <Text text={pending ? 'Pending' : 'Not pending'} />
          </form>
          <form action={secondAction} ref={secondFormRef} />
        </>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App />));
    assertLog(['Not pending']);
    expect(container.textContent).toBe('Not pending');

    await submit(firstFormRef.current);
    assertLog(['First action started']);
    expect(container.textContent).toBe('Not pending');

    await act(() => resolveText('First'));
  });
```

- [x] **Step 2: Add DEV warning assertion**

`ReactDOMForm-test.js` already initializes `assertConsoleErrorDev` in `beforeEach`. After the initial render, assert the warning:

```js
    await act(() => root.render(<App />));
    assertConsoleErrorDev([
      'useFormStatus() was called in a component that returns multiple <form> elements. ' +
        'React cannot infer which form status to read. Move useFormStatus() into a child ' +
        'of the form, or use an explicit form scope when that API is available.\n' +
        '    in App (at **)',
    ]);
```

- [x] **Step 3: Run ambiguity test**

Run:

```bash
yarn test ReactDOMForm-test --runInBand
```

Expected: all tests in `ReactDOMForm-test` pass.

- [x] **Step 4: Commit ambiguity coverage**

```bash
git add packages/react-dom/src/__tests__/ReactDOMForm-test.js
git commit -m "test: cover ambiguous owned form status"
```

---

### Task 7: Verify Server Rendering Stays Not Pending

**Files:**
- Modify: `packages/react-dom/src/__tests__/ReactDOMFizzForm-test.js`

- [x] **Step 1: Add same-component server render assertion**

Near the existing `useFormStatus is not pending during server render` test, add:

```js
  it('useFormStatus in the same component as a form is not pending during server render', async () => {
    function App() {
      const {pending} = useFormStatus();
      return (
        <form action={() => {}}>
          <span>{pending ? 'Pending' : 'Not pending'}</span>
        </form>
      );
    }

    const stream = await serverAct(() =>
      ReactDOMServer.renderToReadableStream(<App />),
    );
    await readIntoContainer(stream);
    expect(container.textContent).toBe('Not pending');
  });
```

`ReactDOMFizzForm-test.js` already defines `readIntoContainer(stream)` and initializes `serverAct` in `beforeEach`; use both exactly as shown.

- [x] **Step 2: Run server form test**

Run:

```bash
yarn test ReactDOMFizzForm-test --runInBand
```

Expected: all tests in `ReactDOMFizzForm-test` pass.

- [x] **Step 3: Commit server coverage**

```bash
git add packages/react-dom/src/__tests__/ReactDOMFizzForm-test.js
git commit -m "test: preserve server form status behavior"
```

---

### Task 8: Full Focused Verification

**Files:**
- No source changes.

- [x] **Step 1: Run development focused suites**

```bash
yarn test ReactDOMForm-test ReactDOMFizzForm-test --runInBand
```

Expected: both suites pass.

- [x] **Step 2: Run production focused suites**

```bash
yarn test --prod ReactDOMForm-test ReactDOMFizzForm-test --runInBand
```

Expected: both suites pass in production mode.

- [x] **Step 3: Run changed-file lint**

```bash
yarn linc
```

Expected: changed-file lint passes.

- [x] **Step 4: Run formatting**

```bash
yarn prettier
```

Expected: command completes and leaves no unexpected formatting diff.

- [x] **Step 5: Run Flow for DOM renderer**

```bash
cp scripts/flow/dom-node/.flowconfig .flowconfig
./node_modules/.bin/flow status
```

Expected: Flow exits with code 0.

- [x] **Step 6: Check whitespace**

```bash
git diff --check
```

Expected: no whitespace errors.

- [x] **Step 7: Commit verification-only formatting changes**

Run `git status --short`. When `yarn prettier` changed files, commit them:

```bash
git add packages/react-dom/src/__tests__/ReactDOMForm-test.js packages/react-dom/src/__tests__/ReactDOMFizzForm-test.js packages/react-reconciler/src/ReactFiberHooks.js packages/react-reconciler/src/ReactFiberBeginWork.js
git commit -m "style: format owned form status changes"
```

When `git status --short` shows no formatting changes after verification, skip this commit.

---

## Implementation Notes (2026-07-06)

Tasks 1-3 were implemented as planned. Tasks 4-7 landed with the following
deviations from the plan's sketched code, all discovered through the plan's own
verification steps:

1. **Owner notification moved from render phase to commit phase.** The plan's
   `markOwnedHostTransitionStatusChanged` ran during `updateHostComponent` and
   mutated owner fiber lanes from within a render attempt. Form actions apply
   pending status as an optimistic update with a `revertLane`, so render
   attempts at the transition lane compute a reverted (not pending) status and
   then suspend without committing. Notifying owners from those doomed attempts
   caused an infinite re-render loop (observed: 1785 re-renders in one test
   run). The implementation instead:
   - sets the `Callback` flag on the form fiber during render when the newly
     computed status differs from the committed status (a flag on the
     work-in-progress fiber dies with a discarded attempt, so this is safe);
   - notifies owners from `commitLayoutEffectOnFiber` via a new
     `commitOwnedHostTransitionStatusChanged`, which schedules the owner with
     `enqueueConcurrentRenderForLane` + `scheduleUpdateOnFiber` at `SyncLane` -
     the same mechanism `useSyncExternalStore` uses for store inconsistency.
   The plan's `scheduleOwnedHostTransitionStatusWorkOnParentPath` was dropped;
   proper update scheduling handles root/child lanes.

2. **The hook carries the observed status across renders.** The plan's
   `useHostTransitionStatus` always returned `NotPending` when no parent
   context was pending, because `renderWithHooks` clears the update queue
   before hooks run and binding happens after the component returns. The
   implemented `recordOwnedHostTransitionStatusDependency` reads the previous
   render's dependency (matched by hook call order index on the alternate's
   update queue) and returns its carried `value`.

3. **`renderedValue` field + bailout prevention.** Dependencies track both the
   last observed status (`value`, updated by the commit-phase notifier) and the
   status the owner actually rendered with (`renderedValue`). When they differ
   during a re-render the hook calls `markWorkInProgressReceivedUpdate()`,
   otherwise the owner bails out after rendering and its children never
   reconcile against the new status.

4. **Alternate-aware provider identity.** Fibers flip between two alternates,
   so `dependency.provider === provider` checks also accept
   `provider.alternate`.

5. **Loose null checks on `ownedHostTransitionStatus`.** Non-function fibers
   reuse `updateQueue` for other data structures where the property is
   `undefined`; the ancestor walk uses `!= null` to avoid crashing on them.

6. **Fizz test assertion.** The server-render test asserts on the `<span>`'s
   text instead of `container.textContent`, because Fizz injects the form
   action replay script whose source otherwise appears in `textContent`.
