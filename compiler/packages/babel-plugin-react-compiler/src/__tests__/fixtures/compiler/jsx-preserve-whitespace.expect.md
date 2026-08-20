
## Input

```javascript
import {StaticText1} from 'shared-runtime';

function Component() {
  return (
    <div>
      Before text
      <StaticText1 />
      Middle text
      <StaticText1>
        Inner before text
        <StaticText1 />
        Inner middle text
        <StaticText1 />
        Inner after text
      </StaticText1>
      After text
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { StaticText1 } from "shared-runtime";

function Component() {
  const $ = _c(3);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <StaticText1 />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = <StaticText1 />;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  let t2;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = (
      <div>
        Before text{t0}Middle text
        <StaticText1>
          Inner before text{t1}Inner middle text
          <StaticText1 />
          Inner after text
        </StaticText1>
        After text
      </div>
    );
    $[2] = t2;
  } else {
    t2 = $[2];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) <div>Before text<div>StaticText1</div>Middle text<div>StaticText1Inner before text<div>StaticText1</div>Inner middle text<div>StaticText1</div>Inner after text</div>After text</div>