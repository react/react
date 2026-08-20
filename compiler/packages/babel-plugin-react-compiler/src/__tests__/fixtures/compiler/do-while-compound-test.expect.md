
## Input

```javascript
function Component(props) {
  let x = [1, 2, 3];
  let ret = [];
  do {
    let item = x.pop();
    ret.push(item * 2);
  } while (x.length && props.cond);
  return ret;
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
function Component(props) {
  const $ = _c(2);
  let ret;
  if ($[0] !== props) {
    const x = [1, 2, 3];
    ret = [];
    do {
      const item = x.pop();
      ret.push(item * 2);
    } while (x.length && props.cond);
    $[0] = props;
    $[1] = ret;
  } else {
    ret = $[1];
  }
  return ret;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      