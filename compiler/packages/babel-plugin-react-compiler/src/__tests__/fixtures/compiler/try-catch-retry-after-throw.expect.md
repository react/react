
## Input

```javascript
// @compilationMode:"annotation" @panicThreshold:"none"

function Component(params) {
  'use memo';
  const selectedOptions = (() => {
    try {
      const channel = params.parse()?.channel;
      return channel ? [{label: `#${channel}`, value: channel}] : [];
    } catch {
      return [];
    }
  })();
  return selectedOptions;
}

const input = {
  value: 'success',
  shouldThrow: true,
  parse() {
    if (this.shouldThrow) {
      this.shouldThrow = false;
      throw new Error('oops');
    }
    return {channel: this.value};
  },
};

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [input],
  sequentialRenders: [input, input],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @compilationMode:"annotation" @panicThreshold:"none"

function Component(params) {
  "use memo";
  const $ = _c(5);
  let t0;
  try {
    let t1;
    if ($[0] !== params) {
      t1 = params.parse()?.channel;
      $[0] = params;
      $[1] = t1;
    } else {
      t1 = $[1];
    }
    const channel = t1;
    let t2;
    if ($[2] !== channel) {
      t2 = channel ? [{ label: `#${channel}`, value: channel }] : [];
      $[2] = channel;
      $[3] = t2;
    } else {
      t2 = $[3];
    }
    t0 = t2;
  } catch {
    let t1;
    if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
      t1 = [];
      $[4] = t1;
    } else {
      t1 = $[4];
    }
    t0 = t1;
  }
  const selectedOptions = t0;

  return selectedOptions;
}

const input = {
  value: "success",
  shouldThrow: true,
  parse() {
    if (this.shouldThrow) {
      this.shouldThrow = false;
      throw new Error("oops");
    }
    return { channel: this.value };
  },
};

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [input],
  sequentialRenders: [input, input],
};

```
      
### Eval output
(kind: ok) []
[{"label":"#success","value":"success"}]