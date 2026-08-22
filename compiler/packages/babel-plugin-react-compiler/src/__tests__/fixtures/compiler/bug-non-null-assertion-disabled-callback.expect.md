
## Input

```javascript
function Component({test}: {test: null | {value: string}}) {
  return (
    <button disabled={!test} onClick={() => console.log(test!.value)}>
      Print
    </button>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{test: null}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(t0) {
  const $ = _c(5);
  const { test } = t0;

  const t1 = !test;
  let t2;
  if ($[0] !== test) {
    t2 = () => console.log(test.value);
    $[0] = test;
    $[1] = t2;
  } else {
    t2 = $[1];
  }
  let t3;
  if ($[2] !== t1 || $[3] !== t2) {
    t3 = (
      <button disabled={t1} onClick={t2}>
        Print
      </button>
    );
    $[2] = t1;
    $[3] = t2;
    $[4] = t3;
  } else {
    t3 = $[4];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ test: null }],
};

```
      
### Eval output
(kind: ok) <button disabled="">Print</button>