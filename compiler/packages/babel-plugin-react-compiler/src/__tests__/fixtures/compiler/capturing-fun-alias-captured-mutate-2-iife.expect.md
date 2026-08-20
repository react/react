
## Input

```javascript
import {mutate} from 'shared-runtime';

function component(foo, bar) {
  let x = {foo};
  let y = {bar};
  (function () {
    let a = {y};
    let b = x;
    a.x = b;
  })();
  mutate(y);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: ['foo', 'bar'],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { mutate } from "shared-runtime";

function component(foo, bar) {
  const $ = _c(3);
  let x;
  if ($[0] !== bar || $[1] !== foo) {
    x = { foo };
    const y = { bar };

    const a = { y };
    const b = x;
    a.x = b;

    mutate(y);
    $[0] = bar;
    $[1] = foo;
    $[2] = x;
  } else {
    x = $[2];
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: ["foo", "bar"],
};

```
      
### Eval output
(kind: ok) {"foo":"foo"}