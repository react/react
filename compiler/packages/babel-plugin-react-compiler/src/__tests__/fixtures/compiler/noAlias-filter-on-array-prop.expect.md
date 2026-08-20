
## Input

```javascript
function Component(props) {
  const filtered = props.items.filter(item => item != null);
  return filtered;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      items: [{a: true}, null, true, false, null, 'string', 3.14, null, [null]],
    },
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.items) {
    t0 = props.items.filter(_temp);
    $[0] = props.items;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const filtered = t0;
  return filtered;
}
function _temp(item) {
  return item != null;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      items: [
        { a: true },
        null,
        true,
        false,
        null,
        "string",
        3.14,
        null,
        [null],
      ],
    },
  ],
};

```
      
### Eval output
(kind: ok) [{"a":true},true,false,"string",3.14,[null]]