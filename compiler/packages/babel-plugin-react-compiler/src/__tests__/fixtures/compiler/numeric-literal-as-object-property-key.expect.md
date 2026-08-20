
## Input

```javascript
function Test() {
  const obj = {
    21: 'dimaMachina',
  };
  // Destructuring assignment
  const {21: myVar} = obj;
  return (
    <div>
      {obj[21]}
      {myVar}
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Test,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Test() {
  const $ = _c(2);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = { 21: "dimaMachina" };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const obj = t0;

  const { 21: myVar } = obj;
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = (
      <div>
        {obj[21]}
        {myVar}
      </div>
    );
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Test,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div>dimaMachinadimaMachina</div>