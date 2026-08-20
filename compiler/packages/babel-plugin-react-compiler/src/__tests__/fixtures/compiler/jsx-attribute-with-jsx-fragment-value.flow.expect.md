
## Input

```javascript
// @flow
import {Stringify} from 'shared-runtime';

function Component({items}) {
  // Per the spec, <Foo value=<>{...}</> /> is valid.
  // But many tools don't allow fragments as jsx attribute values,
  // so we ensure not to emit them wrapped in an expression container
  return items.length > 0 ? (
    <Foo
      value={
        <>
          {items.map(item => (
            <Stringify key={item.id} item={item} />
          ))}
        </>
      }></Foo>
  ) : null;
}

function Foo({value}) {
  return <div>{value}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{items: [{id: 1, name: 'One!'}]}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function Component(t0) {
  const $ = _c(2);
  const { items } = t0;
  let t1;
  if ($[0] !== items) {
    t1 = items.length > 0 ? <Foo value={<>{items.map(_temp)}</>} /> : null;
    $[0] = items;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}
function _temp(item) {
  return <Stringify key={item.id} item={item} />;
}

function Foo(t0) {
  const $ = _c(2);
  const { value } = t0;
  let t1;
  if ($[0] !== value) {
    t1 = <div>{value}</div>;
    $[0] = value;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ items: [{ id: 1, name: "One!" }] }],
};

```
      
### Eval output
(kind: ok) <div><div>{"item":{"id":1,"name":"One!"}}</div></div>