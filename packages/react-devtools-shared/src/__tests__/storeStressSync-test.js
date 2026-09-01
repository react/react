/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {getLegacyRenderImplementation} from './utils';

describe('StoreStress (Legacy Mode)', () => {
  let React;
  let act;
  let bridge;
  let store;
  let print;

  function readValue(promise) {
    if (typeof React.use === 'function') {
      return React.use(promise);
    }

    // Support for React < 19.0
    switch (promise.status) {
      case 'fulfilled':
        return promise.value;
      case 'rejected':
        throw promise.reason;
      case 'pending':
        throw promise;
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

  beforeEach(() => {
    bridge = global.bridge;
    store = global.store;
    store.collapseNodesByDefault = false;

    React = require('react');

    const utils = require('./utils');
    act = utils.act;

    print = require('./__serializers__/storeSerializer').print;
  });

  const {render, unmount, createContainer, getContainer} =
    getLegacyRenderImplementation();

  // This is a stress test for the tree mount/update/unmount traversal.
  // It renders different trees that should produce the same output.
  // @reactVersion >= 16.9
  // @reactVersion < 19
  // @gate !disableLegacyMode
  it('should handle a stress test with different tree operations (Legacy Mode)', () => {
    let setShowX;
    const A = () => 'a';
    const B = () => 'b';
    const C = () => {
      // We'll be manually flipping this component back and forth in the test.
      // We only do this for a single node in order to verify that DevTools
      // can handle a subtree switching alternates while other subtrees are memoized.
      const [showX, _setShowX] = React.useState(false);
      setShowX = _setShowX;
      return showX ? <X /> : 'c';
    };
    const D = () => 'd';
    const E = () => 'e';
    const X = () => 'x';
    const a = <A key="a" />;
    const b = <B key="b" />;
    const c = <C key="c" />;
    const d = <D key="d" />;
    const e = <E key="e" />;

    function Parent({children}) {
      return children;
    }

    // 1. Render a normal version of [a, b, c, d, e].
    act(() => render(<Parent>{[a, b, c, d, e]}</Parent>));
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Parent>
            <A key="a">
            <B key="b">
            <C key="c">
            <D key="d">
            <E key="e">
    `);
    expect(getContainer().textContent).toMatch('abcde');
    const snapshotForABCDE = print(store);

    // 2. Render a version where <C /> renders an <X /> child instead of 'c'.
    // This is how we'll test an update to a single component.
    act(() => {
      setShowX(true);
    });
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Parent>
            <A key="a">
            <B key="b">
          ▾ <C key="c">
              <X>
            <D key="d">
            <E key="e">
    `);
    expect(getContainer().textContent).toMatch('abxde');
    const snapshotForABXDE = print(store);

    // 3. Verify flipping it back produces the original result.
    act(() => {
      setShowX(false);
    });
    expect(getContainer().textContent).toMatch('abcde');
    expect(print(store)).toBe(snapshotForABCDE);

    // 4. Clean up.
    act(() => unmount());
    expect(print(store)).toBe('');

    // Now comes the interesting part.
    // All of these cases are equivalent to [a, b, c, d, e] in output.
    // We'll verify that DevTools produces the same snapshots for them.
    // These cases are picked so that rendering them sequentially in the same
    // container results in a combination of mounts, updates, unmounts, and reorders.
    // prettier-ignore
    const cases = [
      [a, b, c, d, e],
      [[a], b, c, d, e],
      [[a, b], c, d, e],
      [[a, b], c, [d, e]],
      [[a, b], c, [d, '', e]],
      [[a], b, c, d, [e]],
      [a, b, [[c]], d, e],
      [[a, ''], [b], [c], [d], [e]],
      [a, b, [c, [d, ['', e]]]],
      [a, b, c, d, e],
      [<div key="0">{a}</div>, b, c, d, e],
      [<div key="0">{a}{b}</div>, c, d, e],
      [<div key="0">{a}{b}</div>, c, <div key="1">{d}{e}</div>],
      [<div key="1">{a}{b}</div>, c, <div key="0">{d}{e}</div>],
      [<div key="0">{a}{b}</div>, c, <div key="1">{d}{e}</div>],
      [<div key="2">{a}{b}</div>, c, <div key="3">{d}{e}</div>],
      [<span key="0">{a}</span>, b, c, d, [e]],
      [a, b, <span key="0"><span>{c}</span></span>, d, e],
      [<div key="0">{a}</div>, [b], <span key="1">{c}</span>, [d], <div key="2">{e}</div>],
      [a, b, [c, <div key="0">{d}<span>{e}</span></div>], ''],
      [a, [[]], b, c, [d, [[]], e]],
      [[[a, b, c, d], e]],
      [a, b, c, d, e],
    ];

    // 5. Test fresh mount for each case.
    for (let i = 0; i < cases.length; i++) {
      // Ensure fresh mount.
      createContainer();

      // Verify mounting 'abcde'.
      act(() => render(<Parent>{cases[i]}</Parent>));
      expect(getContainer().textContent).toMatch('abcde');
      expect(print(store)).toEqual(snapshotForABCDE);

      // Verify switching to 'abxde'.
      act(() => {
        setShowX(true);
      });
      expect(getContainer().textContent).toMatch('abxde');
      expect(print(store)).toBe(snapshotForABXDE);

      // Verify switching back to 'abcde'.
      act(() => {
        setShowX(false);
      });
      expect(getContainer().textContent).toMatch('abcde');
      expect(print(store)).toBe(snapshotForABCDE);

      // Clean up.
      act(() => unmount());
      expect(print(store)).toBe('');
    }

    // 6. Verify *updates* by reusing the container between iterations.
    // There'll be no unmounting until the very end.
    createContainer();
    for (let i = 0; i < cases.length; i++) {
      // Verify mounting 'abcde'.
      act(() => render(<Parent>{cases[i]}</Parent>));
      expect(getContainer().textContent).toMatch('abcde');
      expect(print(store)).toEqual(snapshotForABCDE);

      // Verify switching to 'abxde'.
      act(() => {
        setShowX(true);
      });
      expect(getContainer().textContent).toMatch('abxde');
      expect(print(store)).toBe(snapshotForABXDE);

      // Verify switching back to 'abcde'.
      act(() => {
        setShowX(false);
      });
      expect(getContainer().textContent).toMatch('abcde');
      expect(print(store)).toBe(snapshotForABCDE);
      // Don't unmount. Reuse the container between iterations.
    }
    act(() => unmount());
    expect(print(store)).toBe('');
  });

  // @reactVersion >= 16.9
  // @reactVersion <= 18.2
  it('should handle stress test with reordering (Legacy Mode)', () => {
    const A = () => 'a';
    const B = () => 'b';
    const C = () => 'c';
    const D = () => 'd';
    const E = () => 'e';
    const a = <A key="a" />;
    const b = <B key="b" />;
    const c = <C key="c" />;
    const d = <D key="d" />;
    const e = <E key="e" />;

    // prettier-ignore
    const steps = [
      a,
      b,
      c,
      d,
      e,
      [a],
      [b],
      [c],
      [d],
      [e],
      [a, b],
      [b, a],
      [b, c],
      [c, b],
      [a, c],
      [c, a],
    ];

    const stepsSnapshot = [
      `
      [root]
        ▾ <Root>
            <A key="a">
    `,
      `
      [root]
        ▾ <Root>
            <B key="b">
    `,
      `
      [root]
        ▾ <Root>
            <C key="c">
    `,
      `
      [root]
        ▾ <Root>
            <D key="d">
      `,
      `
      [root]
        ▾ <Root>
            <E key="e">
      `,
      `
      [root]
        ▾ <Root>
            <A key="a">
      `,
      `
      [root]
        ▾ <Root>
            <B key="b">
      `,
      `
      [root]
        ▾ <Root>
            <C key="c">
      `,
      `
      [root]
        ▾ <Root>
            <D key="d">
      `,
      `
      [root]
        ▾ <Root>
            <E key="e">
      `,
      `
      [root]
        ▾ <Root>
            <A key="a">
            <B key="b">
      `,
      `
      [root]
        ▾ <Root>
            <B key="b">
            <A key="a">
      `,
      `
      [root]
        ▾ <Root>
            <B key="b">
            <C key="c">
      `,
      `
      [root]
        ▾ <Root>
            <C key="c">
            <B key="b">
      `,
      `
      [root]
        ▾ <Root>
            <A key="a">
            <C key="c">
      `,
      `
      [root]
        ▾ <Root>
            <C key="c">
            <A key="a">
      `,
    ];

    const Root = ({children}) => {
      return children;
    };

    // 1. Capture the expected render result.
    const snapshots = [];
    for (let i = 0; i < steps.length; i++) {
      createContainer();

      act(() => render(<Root>{steps[i]}</Root>));
      // We snapshot each step once so it doesn't regress.
      expect(store).toMatchInlineSnapshot(stepsSnapshot[i]);
      snapshots.push(print(store));
      act(() => unmount());
      expect(print(store)).toBe('');
    }

    // 2. Verify that we can update from every step to every other step and back.
    for (let i = 0; i < steps.length; i++) {
      for (let j = 0; j < steps.length; j++) {
        createContainer();

        act(() => render(<Root>{steps[i]}</Root>));
        expect(print(store)).toMatch(snapshots[i]);
        act(() => render(<Root>{steps[j]}</Root>));
        expect(print(store)).toMatch(snapshots[j]);
        act(() => render(<Root>{steps[i]}</Root>));
        expect(print(store)).toMatch(snapshots[i]);
        act(() => unmount());
        expect(print(store)).toBe('');
      }
    }

    // 3. Same test as above, but this time we wrap children in a host component.
    for (let i = 0; i < steps.length; i++) {
      for (let j = 0; j < steps.length; j++) {
        createContainer();

        act(() =>
          render(
            <Root>
              <div>{steps[i]}</div>
            </Root>,
          ),
        );
        expect(print(store)).toMatch(snapshots[i]);
        act(() =>
          render(
            <Root>
              <div>{steps[j]}</div>
            </Root>,
          ),
        );
        expect(print(store)).toMatch(snapshots[j]);
        act(() =>
          render(
            <Root>
              <div>{steps[i]}</div>
            </Root>,
          ),
        );
        expect(print(store)).toMatch(snapshots[i]);
        act(() => unmount());
        expect(print(store)).toBe('');
      }
    }
  });

  // @reactVersion >= 18.0
  // @reactVersion <= 18.2
  it('should handle a stress test for Suspense (Legacy Mode)', async () => {
    const A = () => 'a';
    const B = () => 'b';
    const C = () => 'c';
    const X = () => 'x';
    const Y = () => 'y';
    const Z = () => 'z';
    const a = <A key="a" />;
    const b = <B key="b" />;
    const c = <C key="c" />;
    const z = <Z key="z" />;

    // prettier-ignore
    const steps = [
      a,
      [a],
      [a, b, c],
      [c, b, a],
      [c, null, a],
      <React.Fragment>{c}{a}</React.Fragment>,
      <div>{c}{a}</div>,
      <div><span>{a}</span>{b}</div>,
      [[a]],
      null,
      b,
      a,
    ];

    // Excluding Suspense tree here due to different measurement semantics for fallbacks
    const stepsSnapshot = [
      `
        "[root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
                <A key="a">
              <Y>"
      `,
      `
        "[root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
                <A key="a">
              <Y>"
      `,
      `
        "[root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
                <A key="a">
                <B key="b">
                <C key="c">
              <Y>"
      `,
      `
        "[root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
                <C key="c">
                <B key="b">
                <A key="a">
              <Y>"
      `,
      `
        "[root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
                <C key="c">
                <A key="a">
              <Y>"
      `,
      `
        "[root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
                <C key="c">
                <A key="a">
              <Y>"
      `,
      `
        "[root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
                <C key="c">
                <A key="a">
              <Y>"
      `,
      `
        "[root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
                <A key="a">
                <B key="b">
              <Y>"
      `,
      `
        "[root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
                <A key="a">
              <Y>"
      `,
      `
        "[root]
          ▾ <Root>
              <X>
              <Suspense>
              <Y>"
      `,
      `
        "[root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
                <B key="b">
              <Y>"
      `,
      `
        "[root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
                <A key="a">
              <Y>"
      `,
    ];

    const never = new Promise(() => {});
    const Never = () => {
      readValue(never);
    };

    const Root = ({children}) => {
      return children;
    };

    // 1. For each step, check Suspense can render them as initial primary content.
    // This is the only step where we use Jest snapshots.
    const snapshots = [];
    for (let i = 0; i < steps.length; i++) {
      createContainer();

      act(() =>
        render(
          <Root>
            <X />
            <React.Suspense fallback={z}>{steps[i]}</React.Suspense>
            <Y />
          </Root>,
        ),
      );
      // We snapshot each step once so it doesn't regress.
      expect(print(store, undefined, undefined, false)).toMatchInlineSnapshot(
        stepsSnapshot[i],
      );
      snapshots.push(print(store, undefined, undefined, false));
      act(() => unmount());
      expect(print(store)).toBe('');
    }

    // 2. Verify check Suspense can render same steps as initial fallback content.
    for (let i = 0; i < steps.length; i++) {
      createContainer();

      act(() =>
        render(
          <Root>
            <X />
            <React.Suspense fallback={steps[i]}>
              <Z />
              <Never />
              <Z />
            </React.Suspense>
            <Y />
          </Root>,
        ),
      );
      expect(print(store, undefined, undefined, false)).toEqual(snapshots[i]);
      act(() => unmount());
      expect(print(store)).toBe('');
    }

    // 3. Verify we can update from each step to each step in primary mode.
    for (let i = 0; i < steps.length; i++) {
      for (let j = 0; j < steps.length; j++) {
        // Always start with a fresh container and steps[i].
        createContainer();

        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={z}>{steps[i]}</React.Suspense>
              <Y />
            </Root>,
          ),
        );
        expect(print(store, undefined, undefined, false)).toEqual(snapshots[i]);
        // Re-render with steps[j].
        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={z}>{steps[j]}</React.Suspense>
              <Y />
            </Root>,
          ),
        );
        // Verify the successful transition to steps[j].
        expect(print(store, undefined, undefined, false)).toEqual(snapshots[j]);
        // Check that we can transition back again.
        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={z}>{steps[i]}</React.Suspense>
              <Y />
            </Root>,
          ),
        );
        expect(print(store, undefined, undefined, false)).toEqual(snapshots[i]);
        // Clean up after every iteration.
        act(() => unmount());
        expect(print(store)).toBe('');
      }
    }

    // 4. Verify we can update from each step to each step in fallback mode.
    for (let i = 0; i < steps.length; i++) {
      for (let j = 0; j < steps.length; j++) {
        // Always start with a fresh container and steps[i].
        createContainer();

        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={steps[i]}>
                <Z />
                <Never />
                <Z />
              </React.Suspense>
              <Y />
            </Root>,
          ),
        );
        expect(print(store, undefined, undefined, false)).toEqual(snapshots[i]);
        // Re-render with steps[j].
        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={steps[j]}>
                <Z />
                <Never />
                <Z />
              </React.Suspense>
              <Y />
            </Root>,
          ),
        );
        // Verify the successful transition to steps[j].
        expect(print(store, undefined, undefined, false)).toEqual(snapshots[j]);
        // Check that we can transition back again.
        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={steps[i]}>
                <Z />
                <Never />
                <Z />
              </React.Suspense>
              <Y />
            </Root>,
          ),
        );
        expect(print(store, undefined, undefined, false)).toEqual(snapshots[i]);
        // Clean up after every iteration.
        act(() => unmount());
        expect(print(store)).toBe('');
      }
    }

    // 5. Verify we can update from each step to each step when moving primary -> fallback.
    for (let i = 0; i < steps.length; i++) {
      for (let j = 0; j < steps.length; j++) {
        // Always start with a fresh container and steps[i].
        createContainer();

        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={z}>{steps[i]}</React.Suspense>
              <Y />
            </Root>,
          ),
        );
        expect(print(store, undefined, undefined, false)).toEqual(snapshots[i]);
        // Re-render with steps[j].
        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={steps[j]}>
                <Z />
                <Never />
                <Z />
              </React.Suspense>
              <Y />
            </Root>,
          ),
        );
        // Verify the successful transition to steps[j].
        expect(print(store, undefined, undefined, false)).toEqual(snapshots[j]);
        // Check that we can transition back again.
        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={z}>{steps[i]}</React.Suspense>
              <Y />
            </Root>,
          ),
        );
        expect(print(store, undefined, undefined, false)).toEqual(snapshots[i]);
        // Clean up after every iteration.
        act(() => unmount());
        expect(print(store)).toBe('');
      }
    }

    // 6. Verify we can update from each step to each step when moving fallback -> primary.
    for (let i = 0; i < steps.length; i++) {
      for (let j = 0; j < steps.length; j++) {
        // Always start with a fresh container and steps[i].
        createContainer();

        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={steps[i]}>
                <Z />
                <Never />
                <Z />
              </React.Suspense>
              <Y />
            </Root>,
          ),
        );
        expect(print(store, undefined, undefined, false)).toEqual(snapshots[i]);
        // Re-render with steps[j].
        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={z}>{steps[j]}</React.Suspense>
              <Y />
            </Root>,
          ),
        );
        // Verify the successful transition to steps[j].
        expect(print(store, undefined, undefined, false)).toEqual(snapshots[j]);
        // Check that we can transition back again.
        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={steps[i]}>
                <Z />
                <Never />
                <Z />
              </React.Suspense>
              <Y />
            </Root>,
          ),
        );
        expect(print(store, undefined, undefined, false)).toEqual(snapshots[i]);
        // Clean up after every iteration.
        act(() => unmount());
        expect(print(store)).toBe('');
      }
    }

    // 7. Verify we can update from each step to each step when toggling Suspense.
    for (let i = 0; i < steps.length; i++) {
      for (let j = 0; j < steps.length; j++) {
        // Always start with a fresh container and steps[i].
        createContainer();

        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={steps[j]}>{steps[i]}</React.Suspense>
              <Y />
            </Root>,
          ),
        );

        // We get ID from the index in the tree above:
        // Root, X, Suspense, ...
        //          ^ (index is 2)
        const suspenseID = store.getElementIDAtIndex(2);

        // Force fallback.
        expect(print(store, undefined, undefined, false)).toEqual(snapshots[i]);
        act(() => {
          bridge.send('overrideSuspense', {
            id: suspenseID,
            rendererID: store.getRendererIDForElement(suspenseID),
            forceFallback: true,
          });
        });
        expect(print(store, undefined, undefined, false)).toEqual(snapshots[j]);

        // Stop forcing fallback.
        act(() => {
          bridge.send('overrideSuspense', {
            id: suspenseID,
            rendererID: store.getRendererIDForElement(suspenseID),
            forceFallback: false,
          });
        });
        expect(print(store, undefined, undefined, false)).toEqual(snapshots[i]);

        // Trigger actual fallback.
        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={steps[j]}>
                <Z />
                <Never />
                <Z />
              </React.Suspense>
              <Y />
            </Root>,
          ),
        );
        expect(print(store, undefined, undefined, false)).toEqual(snapshots[j]);

        // Force fallback while we're in fallback mode.
        act(() => {
          bridge.send('overrideSuspense', {
            id: suspenseID,
            rendererID: store.getRendererIDForElement(suspenseID),
            forceFallback: true,
          });
        });
        // Keep seeing fallback content.
        expect(print(store, undefined, undefined, false)).toEqual(snapshots[j]);

        // Switch to primary mode.
        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={steps[j]}>{steps[i]}</React.Suspense>
              <Y />
            </Root>,
          ),
        );
        // Fallback is still forced though.
        expect(print(store, undefined, undefined, false)).toEqual(snapshots[j]);

        // Stop forcing fallback. This reverts to primary content.
        act(() => {
          bridge.send('overrideSuspense', {
            id: suspenseID,
            rendererID: store.getRendererIDForElement(suspenseID),
            forceFallback: false,
          });
        });
        // Now we see primary content.
        expect(print(store, undefined, undefined, false)).toEqual(snapshots[i]);

        // Clean up after every iteration.
        act(() => unmount());
        expect(print(store)).toBe('');
      }
    }
  });

  // @reactVersion >= 18.0
  // @reactVersion <= 18.2
  it('should handle a stress test for Suspense without type change (Legacy Mode)', () => {
    const A = () => 'a';
    const B = () => 'b';
    const C = () => 'c';
    const X = () => 'x';
    const Y = () => 'y';
    const Z = () => 'z';
    const a = <A key="a" />;
    const b = <B key="b" />;
    const c = <C key="c" />;
    const z = <Z key="z" />;

    // prettier-ignore
    const steps = [
      a,
      [a],
      [a, b, c],
      [c, b, a],
      [c, null, a],
      <React.Fragment>{c}{a}</React.Fragment>,
      <div>{c}{a}</div>,
      <div><span>{a}</span>{b}</div>,
      [[a]],
      null,
      b,
      a,
    ];

    const stepsSnapshot = [
      `
        [root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
              ▾ <MaybeSuspend>
                  <A key="a">
                  <Z>
              <Y>
        [suspense-root]  rects={[]}
          <Suspense name="Unknown" rects={[]}>
      `,
      `
        [root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
              ▾ <MaybeSuspend>
                  <A key="a">
                  <Z>
              <Y>
        [suspense-root]  rects={[]}
          <Suspense name="Unknown" rects={[]}>
      `,
      `
        [root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
              ▾ <MaybeSuspend>
                  <A key="a">
                  <B key="b">
                  <C key="c">
                  <Z>
              <Y>
        [suspense-root]  rects={[]}
          <Suspense name="Unknown" rects={[]}>
      `,
      `
        [root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
              ▾ <MaybeSuspend>
                  <C key="c">
                  <B key="b">
                  <A key="a">
                  <Z>
              <Y>
        [suspense-root]  rects={[]}
          <Suspense name="Unknown" rects={[]}>
      `,
      `
        [root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
              ▾ <MaybeSuspend>
                  <C key="c">
                  <A key="a">
                  <Z>
              <Y>
        [suspense-root]  rects={[]}
          <Suspense name="Unknown" rects={[]}>
      `,
      `
        [root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
              ▾ <MaybeSuspend>
                  <C key="c">
                  <A key="a">
                  <Z>
              <Y>
        [suspense-root]  rects={[]}
          <Suspense name="Unknown" rects={[]}>
      `,
      `
        [root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
              ▾ <MaybeSuspend>
                  <C key="c">
                  <A key="a">
                  <Z>
              <Y>
        [suspense-root]  rects={[]}
          <Suspense name="Unknown" rects={[]}>
      `,
      `
        [root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
              ▾ <MaybeSuspend>
                  <A key="a">
                  <B key="b">
                  <Z>
              <Y>
        [suspense-root]  rects={[]}
          <Suspense name="Unknown" rects={[]}>
      `,
      `
        [root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
              ▾ <MaybeSuspend>
                  <A key="a">
                  <Z>
              <Y>
        [suspense-root]  rects={[]}
          <Suspense name="Unknown" rects={[]}>
      `,
      `
        [root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
              ▾ <MaybeSuspend>
                  <Z>
              <Y>
        [suspense-root]  rects={[]}
          <Suspense name="Unknown" rects={[]}>
      `,
      `
        [root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
              ▾ <MaybeSuspend>
                  <B key="b">
                  <Z>
              <Y>
        [suspense-root]  rects={[]}
          <Suspense name="Unknown" rects={[]}>
      `,
      `
        [root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
              ▾ <MaybeSuspend>
                  <A key="a">
                  <Z>
              <Y>
        [suspense-root]  rects={[]}
          <Suspense name="Unknown" rects={[]}>
      `,
    ];

    const stepsSnapshotTwo = [
      `
        [root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
                <A key="a">
              <Y>
        [suspense-root]  rects={[]}
          <Suspense name="Unknown" rects={null}>
      `,
      `
        [root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
                <A key="a">
              <Y>
        [suspense-root]  rects={[]}
          <Suspense name="Unknown" rects={null}>
      `,
      `
        [root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
                <A key="a">
                <B key="b">
                <C key="c">
              <Y>
        [suspense-root]  rects={[]}
          <Suspense name="Unknown" rects={null}>
      `,
      `
        [root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
                <C key="c">
                <B key="b">
                <A key="a">
              <Y>
        [suspense-root]  rects={[]}
          <Suspense name="Unknown" rects={null}>
      `,
      `
        [root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
                <C key="c">
                <A key="a">
              <Y>
        [suspense-root]  rects={[]}
          <Suspense name="Unknown" rects={null}>
      `,
      `
        [root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
                <C key="c">
                <A key="a">
              <Y>
        [suspense-root]  rects={[]}
          <Suspense name="Unknown" rects={null}>
      `,
      `
        [root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
                <C key="c">
                <A key="a">
              <Y>
        [suspense-root]  rects={[]}
          <Suspense name="Unknown" rects={null}>
      `,
      `
        [root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
                <A key="a">
                <B key="b">
              <Y>
        [suspense-root]  rects={[]}
          <Suspense name="Unknown" rects={null}>
      `,
      `
        [root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
                <A key="a">
              <Y>
        [suspense-root]  rects={[]}
          <Suspense name="Unknown" rects={null}>
      `,
      `
        [root]
          ▾ <Root>
              <X>
              <Suspense>
              <Y>
        [suspense-root]  rects={[]}
          <Suspense name="Unknown" rects={null}>
      `,
      `
        [root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
                <B key="b">
              <Y>
        [suspense-root]  rects={[]}
          <Suspense name="Unknown" rects={null}>
      `,
      `
        [root]
          ▾ <Root>
              <X>
            ▾ <Suspense>
                <A key="a">
              <Y>
        [suspense-root]  rects={[]}
          <Suspense name="Unknown" rects={null}>
      `,
    ];

    const never = new Promise(() => {});
    const Never = () => {
      readValue(never);
    };

    const MaybeSuspend = ({children, suspend}) => {
      if (suspend) {
        return (
          <div>
            {children}
            <Never />
            <X />
          </div>
        );
      }
      return (
        <div>
          {children}
          <Z />
        </div>
      );
    };

    const Root = ({children}) => {
      return children;
    };

    // 1. For each step, check Suspense can render them as initial primary content.
    // This is the only step where we use Jest snapshots.
    const snapshots = [];

    for (let i = 0; i < steps.length; i++) {
      createContainer();

      act(() =>
        render(
          <Root>
            <X />
            <React.Suspense fallback={z}>
              <MaybeSuspend suspend={false}>{steps[i]}</MaybeSuspend>
            </React.Suspense>
            <Y />
          </Root>,
        ),
      );
      // We snapshot each step once so it doesn't regress.
      expect(store).toMatchInlineSnapshot(stepsSnapshot[i]);
      snapshots.push(print(store));
      act(() => unmount());
      expect(print(store)).toBe('');
    }

    // 2. Verify check Suspense can render same steps as initial fallback content.
    // We don't actually assert here because the tree includes <MaybeSuspend>
    // which is different from the snapshots above. So we take more snapshots.
    const fallbackSnapshots = [];
    for (let i = 0; i < steps.length; i++) {
      createContainer();

      act(() =>
        render(
          <Root>
            <X />
            <React.Suspense fallback={steps[i]}>
              <Z />
              <MaybeSuspend suspend={true}>{steps[i]}</MaybeSuspend>
              <Z />
            </React.Suspense>
            <Y />
          </Root>,
        ),
      );
      // We snapshot each step once so it doesn't regress.
      expect(store).toMatchInlineSnapshot(stepsSnapshotTwo[i]);
      fallbackSnapshots.push(print(store, undefined, undefined, false));
      act(() => unmount());
      expect(print(store)).toBe('');
    }

    // 3. Verify we can update from each step to each step in primary mode.
    for (let i = 0; i < steps.length; i++) {
      for (let j = 0; j < steps.length; j++) {
        // Always start with a fresh container and steps[i].
        createContainer();

        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={z}>
                <MaybeSuspend suspend={false}>{steps[i]}</MaybeSuspend>
              </React.Suspense>
              <Y />
            </Root>,
          ),
        );
        expect(print(store)).toEqual(snapshots[i]);
        // Re-render with steps[j].
        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={z}>
                <MaybeSuspend suspend={false}>{steps[j]}</MaybeSuspend>
              </React.Suspense>
              <Y />
            </Root>,
          ),
        );
        // Verify the successful transition to steps[j].
        expect(print(store)).toEqual(snapshots[j]);
        // Check that we can transition back again.
        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={z}>
                <MaybeSuspend suspend={false}>{steps[i]}</MaybeSuspend>
              </React.Suspense>
              <Y />
            </Root>,
          ),
        );
        expect(print(store)).toEqual(snapshots[i]);
        // Clean up after every iteration.
        act(() => unmount());
        expect(print(store)).toBe('');
      }
    }

    // 4. Verify we can update from each step to each step in fallback mode.
    for (let i = 0; i < steps.length; i++) {
      for (let j = 0; j < steps.length; j++) {
        // Always start with a fresh container and steps[i].
        createContainer();

        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={steps[i]}>
                <Z />
                <MaybeSuspend suspend={true}>
                  <X />
                  <Y />
                </MaybeSuspend>
                <Z />
              </React.Suspense>
              <Y />
            </Root>,
          ),
        );
        expect(print(store, undefined, undefined, false)).toEqual(
          fallbackSnapshots[i],
        );
        // Re-render with steps[j].
        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={steps[j]}>
                <Z />
                <MaybeSuspend suspend={true}>
                  <Y />
                  <X />
                </MaybeSuspend>
                <Z />
              </React.Suspense>
              <Y />
            </Root>,
          ),
        );
        // Verify the successful transition to steps[j].
        expect(print(store, undefined, undefined, false)).toEqual(
          fallbackSnapshots[j],
        );
        // Check that we can transition back again.
        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={steps[i]}>
                <Z />
                <MaybeSuspend suspend={true}>
                  <X />
                  <Y />
                </MaybeSuspend>
                <Z />
              </React.Suspense>
              <Y />
            </Root>,
          ),
        );
        expect(print(store, undefined, undefined, false)).toEqual(
          fallbackSnapshots[i],
        );
        // Clean up after every iteration.
        act(() => unmount());
        expect(print(store)).toBe('');
      }
    }

    // 5. Verify we can update from each step to each step when moving primary -> fallback.
    for (let i = 0; i < steps.length; i++) {
      for (let j = 0; j < steps.length; j++) {
        // Always start with a fresh container and steps[i].
        createContainer();

        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={z}>
                <MaybeSuspend suspend={false}>{steps[i]}</MaybeSuspend>
              </React.Suspense>
              <Y />
            </Root>,
          ),
        );
        expect(print(store)).toEqual(snapshots[i]);
        // Re-render with steps[j].
        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={steps[j]}>
                <MaybeSuspend suspend={true}>{steps[i]}</MaybeSuspend>
              </React.Suspense>
              <Y />
            </Root>,
          ),
        );
        // Verify the successful transition to steps[j].
        expect(print(store, undefined, undefined, false)).toEqual(
          fallbackSnapshots[j],
        );
        // Check that we can transition back again.
        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={z}>
                <MaybeSuspend suspend={false}>{steps[i]}</MaybeSuspend>
              </React.Suspense>
              <Y />
            </Root>,
          ),
        );
        expect(print(store)).toEqual(snapshots[i]);
        // Clean up after every iteration.
        act(() => unmount());
        expect(print(store)).toBe('');
      }
    }

    // 6. Verify we can update from each step to each step when moving fallback -> primary.
    for (let i = 0; i < steps.length; i++) {
      for (let j = 0; j < steps.length; j++) {
        // Always start with a fresh container and steps[i].
        createContainer();

        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={steps[i]}>
                <MaybeSuspend suspend={true}>{steps[j]}</MaybeSuspend>
              </React.Suspense>
              <Y />
            </Root>,
          ),
        );
        expect(print(store, undefined, undefined, false)).toEqual(
          fallbackSnapshots[i],
        );
        // Re-render with steps[j].
        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={steps[i]}>
                <MaybeSuspend suspend={false}>{steps[j]}</MaybeSuspend>
              </React.Suspense>
              <Y />
            </Root>,
          ),
        );
        // Verify the successful transition to steps[j].
        expect(print(store)).toEqual(snapshots[j]);
        // Check that we can transition back again.
        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={steps[i]}>
                <MaybeSuspend suspend={true}>{steps[j]}</MaybeSuspend>
              </React.Suspense>
              <Y />
            </Root>,
          ),
        );
        expect(print(store, undefined, undefined, false)).toEqual(
          fallbackSnapshots[i],
        );
        // Clean up after every iteration.
        act(() => unmount());
        expect(print(store)).toBe('');
      }
    }

    // 7. Verify we can update from each step to each step when toggling Suspense.
    for (let i = 0; i < steps.length; i++) {
      for (let j = 0; j < steps.length; j++) {
        // Always start with a fresh container and steps[i].
        createContainer();

        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={steps[j]}>
                <MaybeSuspend suspend={false}>{steps[i]}</MaybeSuspend>
              </React.Suspense>
              <Y />
            </Root>,
          ),
        );

        // We get ID from the index in the tree above:
        // Root, X, Suspense, ...
        //          ^ (index is 2)
        const suspenseID = store.getElementIDAtIndex(2);

        // Force fallback.
        expect(print(store)).toEqual(snapshots[i]);
        act(() => {
          bridge.send('overrideSuspense', {
            id: suspenseID,
            rendererID: store.getRendererIDForElement(suspenseID),
            forceFallback: true,
          });
        });
        expect(print(store, undefined, undefined, false)).toEqual(
          fallbackSnapshots[j],
        );

        // Stop forcing fallback.
        act(() => {
          bridge.send('overrideSuspense', {
            id: suspenseID,
            rendererID: store.getRendererIDForElement(suspenseID),
            forceFallback: false,
          });
        });
        expect(print(store)).toEqual(snapshots[i]);

        // Trigger actual fallback.
        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={steps[j]}>
                <MaybeSuspend suspend={true}>{steps[i]}</MaybeSuspend>
              </React.Suspense>
              <Y />
            </Root>,
          ),
        );
        expect(print(store, undefined, undefined, false)).toEqual(
          fallbackSnapshots[j],
        );

        // Force fallback while we're in fallback mode.
        act(() => {
          bridge.send('overrideSuspense', {
            id: suspenseID,
            rendererID: store.getRendererIDForElement(suspenseID),
            forceFallback: true,
          });
        });
        // Keep seeing fallback content.
        expect(print(store, undefined, undefined, false)).toEqual(
          fallbackSnapshots[j],
        );

        // Switch to primary mode.
        act(() =>
          render(
            <Root>
              <X />
              <React.Suspense fallback={steps[j]}>
                <MaybeSuspend suspend={false}>{steps[i]}</MaybeSuspend>
              </React.Suspense>
              <Y />
            </Root>,
          ),
        );
        // Fallback is still forced though.
        expect(print(store, undefined, undefined, false)).toEqual(
          fallbackSnapshots[j],
        );

        // Stop forcing fallback. This reverts to primary content.
        act(() => {
          bridge.send('overrideSuspense', {
            id: suspenseID,
            rendererID: store.getRendererIDForElement(suspenseID),
            forceFallback: false,
          });
        });
        // Now we see primary content.
        expect(print(store)).toEqual(snapshots[i]);

        // Clean up after every iteration.
        act(() => unmount());
        expect(print(store)).toBe('');
      }
    }
  });
});
