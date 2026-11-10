
## Input

```javascript
function useFoo() {
  let counter = '2';
  return [null].map(() => {
    const postfixIncrement = counter++;
    const prefixIncrement = ++counter;
    const postfixDecrement = counter--;
    const prefixDecrement = --counter;
    return {
      counter,
      postfixIncrement,
      prefixIncrement,
      postfixDecrement,
      prefixDecrement,
    };
  })[0];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function useFoo() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    let counter = "2";
    t0 = [null].map(() => {
      const postfixIncrement = counter++;
      const prefixIncrement = ++counter;
      const postfixDecrement = counter--;
      const prefixDecrement = --counter;
      return {
        counter,
        postfixIncrement,
        prefixIncrement,
        postfixDecrement,
        prefixDecrement,
      };
    });
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0[0];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};

```
      
### Eval output
(kind: ok) {"counter":2,"postfixIncrement":2,"prefixIncrement":4,"postfixDecrement":4,"prefixDecrement":2}