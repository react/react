
## Input

```javascript
// @enablePropagateDepsInHIR
import {arrayPush} from 'shared-runtime';
function useFoo(props) {
  let x = [];
  x.push(props.bar);
  props.cond
    ? ((x = {}), (x = []), x.push(props.foo))
    : ((x = []), (x = []), x.push(props.bar));
  arrayPush(x, 4);
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
import { arrayPush } from "shared-runtime";
function useFoo(props) {
  const $ = _c(4);
  let x;
  if ($[0] !== props.bar || $[1] !== props.cond || $[2] !== props.foo) {
    x = [];
    x.push(props.bar);
    props.cond ? ((x = []), x.push(props.foo)) : ((x = []), x.push(props.bar));
    arrayPush(x, 4);
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
(kind: ok) [55,4]
[55,4]
[3,4]