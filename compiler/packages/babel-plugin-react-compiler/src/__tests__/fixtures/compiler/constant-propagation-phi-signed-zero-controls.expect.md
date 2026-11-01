
## Input

```javascript
function Component({condition}) {
  let positiveZero;
  let negativeZero;
  let nonzero;
  let nan;
  if (condition) {
    positiveZero = 0;
    negativeZero = -0;
    nonzero = 42;
    nan = 0 / 0;
  } else {
    positiveZero = 0;
    negativeZero = -0;
    nonzero = 42;
    nan = 0 / 0;
  }
  return (
    <div>
      {1 / positiveZero},{1 / negativeZero},{nonzero},{`${nan}`},{`${0 === -0}`}
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{condition: true}],
  sequentialRenders: [{condition: true}, {condition: false}, {condition: true}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(t0) {
  const $ = _c(2);
  const { condition } = t0;

  let nan;
  if (condition) {
    nan = NaN;
  } else {
    nan = NaN;
  }

  const t1 = `${nan}`;
  let t2;
  if ($[0] !== t1) {
    t2 = (
      <div>
        {Infinity},{-Infinity},{42},{t1},{"true"}
      </div>
    );
    $[0] = t1;
    $[1] = t2;
  } else {
    t2 = $[1];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ condition: true }],
  sequentialRenders: [
    { condition: true },
    { condition: false },
    { condition: true },
  ],
};

```
      
### Eval output
(kind: ok) <div>Infinity,-Infinity,42,NaN,true</div>
<div>Infinity,-Infinity,42,NaN,true</div>
<div>Infinity,-Infinity,42,NaN,true</div>