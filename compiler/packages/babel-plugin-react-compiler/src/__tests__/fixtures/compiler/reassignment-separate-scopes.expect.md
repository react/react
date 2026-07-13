
## Input

```javascript
function foo(a, b, c) {
  let x = [];
  if (a) {
    x.push(a);
  }
  let y = <div>{x}</div>;

  switch (b) {
    case 0: {
      x = [];
      x.push(b);
      break;
    }
    default: {
      x = [];
      x.push(c);
    }
  }
  return (
    <div>
      {y}
      {x}
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function foo(a, b, c) {
  const $ = _c(10);
  let t0;
  let x;
  if ($[0] !== a) {
    x = [];
    if (a) {
      x.push(a);
    }
    t0 = <div>{x}</div>;
    $[0] = a;
    $[1] = t0;
    $[2] = x;
  } else {
    t0 = $[1];
    x = $[2];
  }
  const y = t0;
  bb0: switch (b) {
    case 0: {
      if ($[3] !== b) {
        x = [];
        x.push(b);
        $[3] = b;
        $[4] = x;
      } else {
        x = $[4];
      }
      break bb0;
    }
    default: {
      if ($[5] !== c) {
        x = [];
        x.push(c);
        $[5] = c;
        $[6] = x;
      } else {
        x = $[6];
      }
    }
  }
  let t1;
  if ($[7] !== x || $[8] !== y) {
    t1 = (
      <div>
        {y}
        {x}
      </div>
    );
    $[7] = x;
    $[8] = y;
    $[9] = t1;
  } else {
    t1 = $[9];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      