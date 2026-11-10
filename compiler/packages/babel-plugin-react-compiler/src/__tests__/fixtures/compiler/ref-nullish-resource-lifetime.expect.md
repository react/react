
## Input

```javascript
// @validateRefAccessDuringRender
import {useRef} from 'react';

function Component({resourceKey, compact, enabled}) {
  const resource = useRef();
  const quota = useRef(null);
  const handle = resource;
  handle.current ??= {key: resourceKey, view: compact ? 'compact' : 'full'};
  quota['current'] ??= enabled ? 0 : 8;
  return <InspectResource resource={resource} quota={quota} />;
}

function InspectResource({resource, quota}) {
  'use no memo';
  return `${resource.current.key}/${resource.current.view}/${quota.current}`;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{resourceKey: 'first', compact: true, enabled: true}],
  sequentialRenders: [
    {resourceKey: 'first', compact: true, enabled: true},
    {resourceKey: 'second', compact: false, enabled: false},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateRefAccessDuringRender
import { useRef } from "react";

function Component(t0) {
  const $ = _c(1);

  let t1;
  let t2;
  const { resourceKey, compact, enabled } = t0;
  const resource = useRef();
  const quota = useRef(null);
  const handle = resource;
  ((t1 = handle), t1.current) ??
    (t1.current = { key: resourceKey, view: compact ? "compact" : "full" });
  ((t2 = quota), t2.current) ?? (t2.current = enabled ? 0 : 8);
  let t3;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = <InspectResource resource={resource} quota={quota} />;
    $[0] = t3;
  } else {
    t3 = $[0];
  }
  return t3;
}

function InspectResource({ resource, quota }) {
  "use no memo";
  return `${resource.current.key}/${resource.current.view}/${quota.current}`;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ resourceKey: "first", compact: true, enabled: true }],
  sequentialRenders: [
    { resourceKey: "first", compact: true, enabled: true },
    { resourceKey: "second", compact: false, enabled: false },
  ],
};

```
      
### Eval output
(kind: ok) first/compact/0
first/compact/0