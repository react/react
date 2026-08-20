
## Input

```javascript
// @enablePropagateDepsInHIR
import {mutate} from 'shared-runtime';

function useFoo(props) {
  let {x} = {x: []};
  x.push(props.bar);
  if (props.cond) {
    ({x} = {x: {}});
    ({x} = {x: []});
    x.push(props.foo);
  }
  mutate(x);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{bar: 'bar', foo: 'foo', cond: true}],
  sequentialRenders: [
    {bar: 'bar', foo: 'foo', cond: true},
    {bar: 'bar', foo: 'foo', cond: true},
    {bar: 'bar', foo: 'foo', cond: false},
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
    ({ x } = { x: [] });
    x.push(props.bar);
    if (props.cond) {
      ({ x } = { x: [] });
      x.push(props.foo);
    }

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
  params: [{ bar: "bar", foo: "foo", cond: true }],
  sequentialRenders: [
    { bar: "bar", foo: "foo", cond: true },
    { bar: "bar", foo: "foo", cond: true },
    { bar: "bar", foo: "foo", cond: false },
  ],
};

```
      
### Eval output
(kind: ok) ["foo","joe"]
["foo","joe"]
["bar","joe"]