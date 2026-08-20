
## Input

```javascript
// @enablePropagateDepsInHIR
import {mutate} from 'shared-runtime';

function useFoo(props) {
  let x = [];
  x.push(props.bar);
  props.cond ? ((x = {}), (x = []), x.push(props.foo)) : null;
  mutate(x);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{cond: false, foo: 2, bar: 55}],
  sequentialRenders: [
    {cond: false, foo: 2, bar: 55},
    {cond: false, foo: 3, bar: 55},
    {cond: true, foo: 3, bar: 55},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePropagateDepsInHIR
import { mutate } from "shared-runtime";

function useFoo(props) {
  const $ = _c(4);
  let x;
  if ($[0] !== props.bar || $[1] !== props.cond || $[2] !== props.foo) {
    x = [];
    x.push(props.bar);
    props.cond ? ((x = []), x.push(props.foo)) : null;
    mutate(x);
    $[0] = props.bar;
    $[1] = props.cond;
    $[2] = props.foo;
    $[3] = x;
  } else {
    x = $[3];
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ cond: false, foo: 2, bar: 55 }],
  sequentialRenders: [
    { cond: false, foo: 2, bar: 55 },
    { cond: false, foo: 3, bar: 55 },
    { cond: true, foo: 3, bar: 55 },
  ],
};

```
      
### Eval output
(kind: ok) [55,"joe"]
[55,"joe"]
[3,"joe"]