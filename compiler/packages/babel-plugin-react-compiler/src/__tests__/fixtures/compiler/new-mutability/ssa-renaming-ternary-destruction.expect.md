
## Input

```javascript
// @enablePropagateDepsInHIR @enableNewMutationAliasingModel
function useFoo(props) {
  let x = [];
  x.push(props.bar);
  // todo: the below should memoize separately from the above
  // my guess is that the phi causes the different `x` identifiers
  // to get added to an alias group. this is where we need to track
  // the actual state of the alias groups at the time of the mutation
  props.cond ? (({x} = {x: {}}), ([x] = [[]]), x.push(props.foo)) : null;
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
import { c as _c } from "react/compiler-runtime"; // @enablePropagateDepsInHIR @enableNewMutationAliasingModel
function useFoo(props) {
  const $ = _c(5);
  let x;
  if ($[0] !== props.bar) {
    x = [];
    x.push(props.bar);
    $[0] = props.bar;
    $[1] = x;
  } else {
    x = $[1];
  }
  if ($[2] !== props.cond || $[3] !== props.foo) {
    props.cond ? (([x] = [[]]), x.push(props.foo)) : null;
    $[2] = props.cond;
    $[3] = props.foo;
    $[4] = x;
  } else {
    x = $[4];
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
(kind: ok) [55]
[55]
[3]