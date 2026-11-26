
## Input

```javascript
// A local that is only mutated with an update expression (`++`/`--`) inside a
// reactive scope must still be saved and restored by that scope, the same way a
// `StoreLocal` reassignment (`+=`) is. Otherwise a later render that reuses the
// memoized scope observes the value from the first render.

function Summary({tick}) {
  function isEven(i) {
    return i % 2 === 0;
  }
  let even = 0;
  let oddSum = 0;
  for (let i = 0; i < 4; i++) {
    if (isEven(i)) {
      even++;
    } else {
      oddSum += i;
    }
  }
  return (
    <p>
      render {tick}: even={even} oddSum={oddSum}
    </p>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Summary,
  params: [{tick: 0}],
  sequentialRenders: [{tick: 0}, {tick: 1}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // A local that is only mutated with an update expression (`++`/`--`) inside a
// reactive scope must still be saved and restored by that scope, the same way a
// `StoreLocal` reassignment (`+=`) is. Otherwise a later render that reuses the
// memoized scope observes the value from the first render.

function Summary(t0) {
  const $ = _c(5);
  const { tick } = t0;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = function isEven(i) {
      return i % 2 === 0;
    };
    $[0] = t1;
  } else {
    t1 = $[0];
  }
  const isEven = t1;

  let even = 0;
  let oddSum = 0;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    for (let i_0 = 0; i_0 < 4; i_0++) {
      if (isEven(i_0)) {
        even++;
      } else {
        oddSum = oddSum + i_0;
      }
    }
    $[1] = even;
    $[2] = oddSum;
  } else {
    even = $[1];
    oddSum = $[2];
  }
  let t2;
  if ($[3] !== tick) {
    t2 = (
      <p>
        render
        {tick}: even={even} oddSum={oddSum}
      </p>
    );
    $[3] = tick;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Summary,
  params: [{ tick: 0 }],
  sequentialRenders: [{ tick: 0 }, { tick: 1 }],
};

```
      
### Eval output
(kind: ok) <p>render 0: even=2 oddSum=4</p>
<p>render 1: even=2 oddSum=4</p>