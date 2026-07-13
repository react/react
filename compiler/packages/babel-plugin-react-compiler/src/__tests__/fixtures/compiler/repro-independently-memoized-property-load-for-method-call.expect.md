
## Input

```javascript
// @flow @enableAssumeHooksFollowRulesOfReact
function Component({label, highlightedItem}) {
  const serverTime = useServerTime();
  const highlight = new Highlight(highlightedItem);

  const time = serverTime.get();
  // subtle bit here: the binary expression infers the result of the call
  // as a primitive and not needing memoization. the logical is necessary
  // because without it there are no intermediate scopes which observe
  // the result of the binary expression, so its memoization can be pruned
  const timestampLabel = time / 1000 || label;

  return (
    <>
      {highlight.render()}
      {timestampLabel}
    </>
  );
}

function useServerTime() {
  'use no forget';

  return {
    get() {
      return 42000; // would be a constant value from the server
    },
  };
}

class Highlight {
  constructor(value) {
    this.value = value;
  }

  render() {
    return this.value;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{label: '<unused>', highlightedItem: 'Seconds passed: '}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(t0) {
  const $ = _c(8);
  const { label, highlightedItem } = t0;
  const serverTime = useServerTime();
  let t1;
  let timestampLabel;
  if ($[0] !== highlightedItem || $[1] !== label || $[2] !== serverTime) {
    const highlight = new Highlight(highlightedItem);
    const time = serverTime.get();
    timestampLabel = time / 1000 || label;
    t1 = highlight.render();
    $[0] = highlightedItem;
    $[1] = label;
    $[2] = serverTime;
    $[3] = t1;
    $[4] = timestampLabel;
  } else {
    t1 = $[3];
    timestampLabel = $[4];
  }
  let t2;
  if ($[5] !== t1 || $[6] !== timestampLabel) {
    t2 = (
      <>
        {t1}
        {timestampLabel}
      </>
    );
    $[5] = t1;
    $[6] = timestampLabel;
    $[7] = t2;
  } else {
    t2 = $[7];
  }
  return t2;
}

function useServerTime() {
  "use no forget";

  return {
    get() {
      return 42000;
    },
  };
}

class Highlight {
  constructor(value) {
    this.value = value;
  }

  render() {
    return this.value;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ label: "<unused>", highlightedItem: "Seconds passed: " }],
};

```
      
### Eval output
(kind: ok) Seconds passed: 42