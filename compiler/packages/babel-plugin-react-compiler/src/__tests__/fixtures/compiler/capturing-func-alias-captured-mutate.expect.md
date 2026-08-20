
## Input

```javascript
import {mutate} from 'shared-runtime';

function Component({foo, bar}) {
  let x = {foo};
  let y = {bar};
  const f0 = function () {
    let a = [y];
    let b = x;
    // this writes y.x = x
    a[0].x = b;
  };
  f0();
  mutate(y.x);
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{foo: 3, bar: 4}],
  sequentialRenders: [
    {foo: 3, bar: 4},
    {foo: 3, bar: 5},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { mutate } from "shared-runtime";

function Component(t0) {
  const $ = _c(3);
  const { foo, bar } = t0;
  let y;
  if ($[0] !== bar || $[1] !== foo) {
    const x = { foo };
    y = { bar };
    const f0 = function () {
      const a = [y];
      const b = x;

      a[0].x = b;
    };

    f0();
    mutate(y.x);
    $[0] = bar;
    $[1] = foo;
    $[2] = y;
  } else {
    y = $[2];
  }
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ foo: 3, bar: 4 }],
  sequentialRenders: [
    { foo: 3, bar: 4 },
    { foo: 3, bar: 5 },
  ],
};

```
      
### Eval output
(kind: ok) {"bar":4,"x":{"foo":3,"wat0":"joe"}}
{"bar":5,"x":{"foo":3,"wat0":"joe"}}