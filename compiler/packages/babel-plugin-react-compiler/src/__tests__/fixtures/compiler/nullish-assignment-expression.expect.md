
## Input

```javascript
function Component(props) {
  const value = {count: null, other: 2, enabled: true, fallback: 0};
  let writes = 0;

  value[props.key] ??= (writes += 1, props.count);
  value.other ??= (writes += 1, props.count);
  value.enabled &&= (writes += 1, props.enabled);
  value.fallback ||= (writes += 1, props.count);

  return [value.count, value.other, value.enabled, value.fallback, writes];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{key: 'count', count: 1, enabled: false}],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(11);
  let value;
  let writes;
  if ($[0] !== props.count || $[1] !== props.enabled || $[2] !== props.key) {
    value = { count: null, other: 2, enabled: true, fallback: 0 };
    writes = 0;

    const t0 = props.key;
    value[t0] ?? (value[t0] = ((writes = 1), props.count));
    value.other ?? (value.other = ((writes = writes + 1), props.count));
    value.enabled && (value.enabled = ((writes = writes + 1), props.enabled));
    value.fallback || (value.fallback = ((writes = writes + 1), props.count));
    $[0] = props.count;
    $[1] = props.enabled;
    $[2] = props.key;
    $[3] = value;
    $[4] = writes;
  } else {
    value = $[3];
    writes = $[4];
  }
  let t0;
  if (
    $[5] !== value.count ||
    $[6] !== value.enabled ||
    $[7] !== value.fallback ||
    $[8] !== value.other ||
    $[9] !== writes
  ) {
    t0 = [value.count, value.other, value.enabled, value.fallback, writes];
    $[5] = value.count;
    $[6] = value.enabled;
    $[7] = value.fallback;
    $[8] = value.other;
    $[9] = writes;
    $[10] = t0;
  } else {
    t0 = $[10];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ key: "count", count: 1, enabled: false }],
  isComponent: false,
};

```

### Eval output
(kind: ok) [1,2,false,1,3]
