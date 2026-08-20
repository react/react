
## Input

```javascript
/**
 * props.b *does* influence `a`
 */
function Component(props) {
  const a = [];
  a.push(props.a);
  label: {
    if (props.b) {
      break label;
    }
    a.push(props.c);
  }
  a.push(props.d);
  return a;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; /**
 * props.b *does* influence `a`
 */
function Component(props) {
  const $ = _c(5);
  let a;
  if (
    $[0] !== props.a ||
    $[1] !== props.b ||
    $[2] !== props.c ||
    $[3] !== props.d
  ) {
    a = [];
    a.push(props.a);
    bb0: {
      if (props.b) {
        break bb0;
      }

      a.push(props.c);
    }

    a.push(props.d);
    $[0] = props.a;
    $[1] = props.b;
    $[2] = props.c;
    $[3] = props.d;
    $[4] = a;
  } else {
    a = $[4];
  }
  return a;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      