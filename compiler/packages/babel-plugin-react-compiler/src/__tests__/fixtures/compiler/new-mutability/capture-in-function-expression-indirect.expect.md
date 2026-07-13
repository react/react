
## Input

```javascript
import {Stringify, mutate} from 'shared-runtime';

function Component({foo, bar}) {
  let x = {foo};
  let y = {bar};
  const f0 = function () {
    let a = {y};
    let b = {x};
    a.y.x = b;
  };
  f0();
  mutate(y);
  return <Stringify x={y} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{foo: 2, bar: 3}],
  sequentialRenders: [
    {foo: 2, bar: 3},
    {foo: 2, bar: 3},
    {foo: 2, bar: 4},
    {foo: 3, bar: 4},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify, mutate } from "shared-runtime";

function Component(t0) {
  const $ = _c(3);
  const { foo, bar } = t0;
  let t1;
  if ($[0] !== bar || $[1] !== foo) {
    const x = { foo };
    const y = { bar };
    const f0 = function () {
      const a = { y };
      const b = { x };
      a.y.x = b;
    };
    f0();
    mutate(y);
    t1 = <Stringify x={y} />;
    $[0] = bar;
    $[1] = foo;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ foo: 2, bar: 3 }],
  sequentialRenders: [
    { foo: 2, bar: 3 },
    { foo: 2, bar: 3 },
    { foo: 2, bar: 4 },
    { foo: 3, bar: 4 },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"x":{"bar":3,"x":{"x":{"foo":2}},"wat0":"joe"}}</div>
<div>{"x":{"bar":3,"x":{"x":{"foo":2}},"wat0":"joe"}}</div>
<div>{"x":{"bar":4,"x":{"x":{"foo":2}},"wat0":"joe"}}</div>
<div>{"x":{"bar":4,"x":{"x":{"foo":3}},"wat0":"joe"}}</div>