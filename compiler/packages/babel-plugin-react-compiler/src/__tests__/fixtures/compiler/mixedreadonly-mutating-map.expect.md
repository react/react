
## Input

```javascript
import {
  arrayPush,
  identity,
  makeArray,
  Stringify,
  useFragment,
} from 'shared-runtime';

/**
 * Bug repro showing why it's invalid for function references to be annotated
 * with a `Read` effect when that reference might lead to the function being
 * invoked.
 *
 * Note that currently, `Array.map` is annotated to have `Read` effects on its
 * operands. This is incorrect as function effects must be replayed when `map`
 * is called
 * - Read:                non-aliasing data dependency
 * - Capture:             maybe-aliasing data dependency
 * - ConditionallyMutate: maybe-aliasing data dependency; maybe-write / invoke
 *     but only if the value is mutable
 *
 * Invalid evaluator result: Found differences in evaluator results Non-forget
 * (expected): (kind: ok)
 *   <div>{"x":[2,2,2],"count":3}</div><div>{"item":1}</div>
 *   <div>{"x":[2,2,2],"count":4}</div><div>{"item":1}</div>
 * Forget:
 *   (kind: ok)
 *   <div>{"x":[2,2,2],"count":3}</div><div>{"item":1}</div>
 *   <div>{"x":[2,2,2,2,2,2],"count":4}</div><div>{"item":1}</div>
 */

function Component({extraJsx}) {
  const x = makeArray();
  const items = useFragment();
  // This closure has the following effects that must be replayed:
  //   - MaybeFreeze / Capture of `items`
  //   - ConditionalMutate of x
  const jsx = items.a.map((item, i) => {
    arrayPush(x, 2);
    return <Stringify item={item} key={i} />;
  });
  const offset = jsx.length;
  for (let i = 0; i < extraJsx; i++) {
    jsx.push(<Stringify item={0} key={i + offset} />);
  }
  const count = jsx.length;
  identity(count);
  return (
    <>
      <Stringify x={x} count={count} />
      {jsx[0]}
    </>
  );
}
export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{extraJsx: 0}],
  sequentialRenders: [{extraJsx: 0}, {extraJsx: 1}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import {
  arrayPush,
  identity,
  makeArray,
  Stringify,
  useFragment,
} from "shared-runtime";

/**
 * Bug repro showing why it's invalid for function references to be annotated
 * with a `Read` effect when that reference might lead to the function being
 * invoked.
 *
 * Note that currently, `Array.map` is annotated to have `Read` effects on its
 * operands. This is incorrect as function effects must be replayed when `map`
 * is called
 * - Read:                non-aliasing data dependency
 * - Capture:             maybe-aliasing data dependency
 * - ConditionallyMutate: maybe-aliasing data dependency; maybe-write / invoke
 *     but only if the value is mutable
 *
 * Invalid evaluator result: Found differences in evaluator results Non-forget
 * (expected): (kind: ok)
 *   <div>{"x":[2,2,2],"count":3}</div><div>{"item":1}</div>
 *   <div>{"x":[2,2,2],"count":4}</div><div>{"item":1}</div>
 * Forget:
 *   (kind: ok)
 *   <div>{"x":[2,2,2],"count":3}</div><div>{"item":1}</div>
 *   <div>{"x":[2,2,2,2,2,2],"count":4}</div><div>{"item":1}</div>
 */

function Component(t0) {
  const $ = _c(6);
  const { extraJsx } = t0;
  const x = makeArray();
  const items = useFragment();

  const jsx = items.a.map((item, i) => {
    arrayPush(x, 2);
    return <Stringify item={item} key={i} />;
  });
  const offset = jsx.length;
  for (let i_0 = 0; i_0 < extraJsx; i_0++) {
    jsx.push(<Stringify item={0} key={i_0 + offset} />);
  }

  const count = jsx.length;
  identity(count);
  let t1;
  if ($[0] !== count || $[1] !== x) {
    t1 = <Stringify x={x} count={count} />;
    $[0] = count;
    $[1] = x;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  let t2;
  if ($[3] !== jsx[0] || $[4] !== t1) {
    t2 = (
      <>
        {t1}
        {jsx[0]}
      </>
    );
    $[3] = jsx[0];
    $[4] = t1;
    $[5] = t2;
  } else {
    t2 = $[5];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ extraJsx: 0 }],
  sequentialRenders: [{ extraJsx: 0 }, { extraJsx: 1 }],
};

```
      
### Eval output
(kind: ok) <div>{"x":[2,2,2],"count":3}</div><div>{"item":1}</div>
<div>{"x":[2,2,2],"count":4}</div><div>{"item":1}</div>