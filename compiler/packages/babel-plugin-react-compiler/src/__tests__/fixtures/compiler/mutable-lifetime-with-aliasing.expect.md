
## Input

```javascript
function mutate(x, y) {
  'use no forget';
  if (!Array.isArray(x.value)) {
    x.value = [];
  }
  x.value.push(y);
  if (y != null) {
    y.value = x;
  }
}

function Component(props) {
  const a = {};
  const b = [a]; // array elements alias
  const c = {};
  const d = {c}; // object values alias

  // capture all the values into this object
  const x = {};
  x.b = b;
  const y = mutate(x, d); // mutation aliases the arg and return value

  // all of these tests are seemingly readonly, since the values are never directly
  // mutated again. but they are all aliased by `x`, which is later modified, and
  // these are therefore mutable references:
  if (a) {
  }
  if (b) {
  }
  if (c) {
  }
  if (d) {
  }
  if (y) {
  }

  // could in theory mutate any of a/b/c/x/z, so the above should be inferred as mutable
  mutate(x, null);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function mutate(x, y) {
  "use no forget";
  if (!Array.isArray(x.value)) {
    x.value = [];
  }
  x.value.push(y);
  if (y != null) {
    y.value = x;
  }
}

function Component(props) {
  const $ = _c(1);
  let x;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const a = {};
    const b = [a];
    const c = {};
    const d = { c };
    x = {};
    x.b = b;
    const y = mutate(x, d);

    if (a) {
    }

    if (b) {
    }

    if (c) {
    }

    if (d) {
    }

    if (y) {
    }

    mutate(x, null);
    $[0] = x;
  } else {
    x = $[0];
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) {"b":[{}],"value":[{"c":{},"value":"[[ cyclic ref *0 ]]"},null]}