
## Input

```javascript
// @flow
function Component({items}) {
  // Per the spec, <Foo value=<>{...}</> /> is valid.
  // But many tools don't allow fragments as jsx attribute values,
  // so we ensure not to emit them wrapped in an expression container
  return items.length > 0 ? (
    <Foo
      value={
        <Bar>
          {items.map(item => (
            <Item key={item.id} item={item} />
          ))}
        </Bar>
      }></Foo>
  ) : null;
}

function Foo({value}) {
  return value;
}

function Bar({children}) {
  return <div>{children}</div>;
}

function Item({item}) {
  return <div>{item.name}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{items: [{id: 1, name: 'One!'}]}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(t0) {
  const $ = _c(2);
  const { items } = t0;
  let t1;
  if ($[0] !== items) {
    t1 =
      items.length > 0 ? <Foo value={<Bar>{items.map(_temp)}</Bar>} /> : null;
    $[0] = items;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}
function _temp(item) {
  return <Item key={item.id} item={item} />;
}

function Foo(t0) {
  const { value } = t0;
  return value;
}

function Bar(t0) {
  const $ = _c(2);
  const { children } = t0;
  let t1;
  if ($[0] !== children) {
    t1 = <div>{children}</div>;
    $[0] = children;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

function Item(t0) {
  const $ = _c(2);
  const { item } = t0;
  let t1;
  if ($[0] !== item.name) {
    t1 = <div>{item.name}</div>;
    $[0] = item.name;
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
(kind: ok) <div><div>One!</div></div>