
## Input

```javascript
function tag(strings, value) {
  return strings[0] + value + strings[1];
}

function Component({name}) {
  return tag`hello ${name}`;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{name: 'Ada'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function tag(strings, value) {
  return strings[0] + value + strings[1];
}

function Component(t0) {
  const $ = _c(2);
  const { name } = t0;
  let t1;
  if ($[0] !== name) {
    t1 = tag`hello ${name}`;
    $[0] = name;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ name: "Ada" }],
};

```
      
### Eval output
(kind: ok) "hello Ada"