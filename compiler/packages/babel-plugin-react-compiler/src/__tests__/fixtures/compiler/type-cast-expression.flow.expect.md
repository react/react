
## Input

```javascript
// @flow
type Foo = {bar: string};
function Component(props) {
  const x = {bar: props.bar};
  const y = (x: Foo);
  y.bar = 'hello';
  const z = (y: Foo);
  return z;
}
export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
type Foo = { bar: string };
function Component(props) {
  const $ = _c(2);
  let y;
  if ($[0] !== props.bar) {
    const x = { bar: props.bar };
    y = (x: Foo);
    y.bar = "hello";
    $[0] = props.bar;
    $[1] = y;
  } else {
    y = $[1];
  }
  const z = (y: Foo);
  return z;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      