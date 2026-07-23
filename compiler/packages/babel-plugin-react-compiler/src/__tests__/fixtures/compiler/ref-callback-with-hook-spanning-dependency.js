// @compilationMode:"infer"

import {useIdentity, makeObject_Primitives, identity} from 'shared-runtime';

/**
 * Regression test for https://github.com/facebook/react/issues/36800
 *
 * `isChromatic` is a (conservatively mutable) value created *before* a hook
 * call (`useIdentity`). It is read by the `ref` callback and also captured by
 * the `className` expression. Previously this dragged the ref callback and the
 * className expression into a single reactive scope whose range spanned the
 * hook call. Scopes that span a hook are pruned wholesale, so the ref callback
 * was never memoized -- producing a fresh ref identity every render, which
 * forces React to detach/reattach the ref on each render.
 *
 * The ref callback only *reads* `isChromatic`, so it must not be pulled across
 * the hook barrier: it should be memoized independently (depending on
 * `resizeRef`), keeping its identity stable across renders. The className
 * expression genuinely captures `isChromatic` and so remains un-memoized.
 */
function Component({className}) {
  const isChromatic = makeObject_Primitives();

  const resizeRef = useIdentity(identity);

  return (
    <div
      ref={node => {
        resizeRef(node);
        if (isChromatic.a) {
          /* ... */
        }
      }}
      className={identity([className, isChromatic])}
    >
      foo
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{className: 'outer'}],
};
