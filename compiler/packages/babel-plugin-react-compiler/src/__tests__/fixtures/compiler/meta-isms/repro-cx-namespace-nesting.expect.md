
## Input

```javascript
// @compilationMode:"infer"
import {makeArray} from 'shared-runtime';

function Component() {
  const items = makeArray('foo', 'bar', '', null, 'baz', false, 'merp');
  const classname = cx.namespace(...items.filter(isNonEmptyString));
  return <div className={classname}>Ok</div>;
}

function isNonEmptyString(s) {
  return typeof s === 'string' && s.trim().length !== 0;
}

const cx = {
  namespace(...items) {
    return items.join(' ');
  },
};

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @compilationMode:"infer"
import { makeArray } from "shared-runtime";

function Component() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const items = makeArray("foo", "bar", "", null, "baz", false, "merp");
    const classname = cx.namespace(...items.filter(isNonEmptyString));
    t0 = <div className={classname}>Ok</div>;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

function isNonEmptyString(s) {
  return typeof s === "string" && s.trim().length !== 0;
}

const cx = {
  namespace(...items) {
    return items.join(" ");
  },
};

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div class="foo bar baz merp">Ok</div>