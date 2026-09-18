
## Input

```javascript
// @flow
import {useState} from 'react';

/**
 * Test that match expressions with tuple patterns don't produce overly
 * conservative mutation effects on the matched values. Without the fix
 * for ModuleLocal global type resolution, Array.isArray inside the match
 * IIFE body would not get its signature resolved, causing
 * MutateTransitiveConditionally on the match argument and wider mutable
 * ranges that prevent fine-grained memoization.
 */
function useFoo(data: {status: string, priority: string}) {
  const [count] = useState(0);
  const active = count > 0;

  if (data.status === 'closed') {
    return active ? 'closed_active' : 'closed';
  }

  return match ([data.priority, active]) {
    ['high', true] => 'high_active',
    ['high', false] => 'high_inactive',
    ['medium', true] => 'medium_active',
    ['medium', false] => 'medium_inactive',
    ['low', true] => 'low_active',
    ['low', false] => 'low_inactive',
    [_, true] => 'other_active',
    [_, false] => 'other_inactive',
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{status: 'open', priority: 'high'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useState } from "react";

function useFoo(data) {
  const $ = _c(3);
  const [count] = useState(0);
  const active = count > 0;

  if (data.status === "closed") {
    return active ? "closed_active" : "closed";
  }
  let t0;
  if ($[0] !== active || $[1] !== data.priority) {
    t0 = [data.priority, active];
    $[0] = active;
    $[1] = data.priority;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  return _temp(t0);
}
function _temp($$gen$m0) {
  if (
    Array.isArray($$gen$m0) &&
    $$gen$m0.length === 2 &&
    $$gen$m0[0] === "high" &&
    $$gen$m0[1] === true
  ) {
    return "high_active";
  }
  if (
    Array.isArray($$gen$m0) &&
    $$gen$m0.length === 2 &&
    $$gen$m0[0] === "high" &&
    $$gen$m0[1] === false
  ) {
    return "high_inactive";
  }
  if (
    Array.isArray($$gen$m0) &&
    $$gen$m0.length === 2 &&
    $$gen$m0[0] === "medium" &&
    $$gen$m0[1] === true
  ) {
    return "medium_active";
  }
  if (
    Array.isArray($$gen$m0) &&
    $$gen$m0.length === 2 &&
    $$gen$m0[0] === "medium" &&
    $$gen$m0[1] === false
  ) {
    return "medium_inactive";
  }
  if (
    Array.isArray($$gen$m0) &&
    $$gen$m0.length === 2 &&
    $$gen$m0[0] === "low" &&
    $$gen$m0[1] === true
  ) {
    return "low_active";
  }
  if (
    Array.isArray($$gen$m0) &&
    $$gen$m0.length === 2 &&
    $$gen$m0[0] === "low" &&
    $$gen$m0[1] === false
  ) {
    return "low_inactive";
  }
  if (
    Array.isArray($$gen$m0) &&
    $$gen$m0.length === 2 &&
    $$gen$m0[1] === true
  ) {
    return "other_active";
  }
  if (
    Array.isArray($$gen$m0) &&
    $$gen$m0.length === 2 &&
    $$gen$m0[1] === false
  ) {
    return "other_inactive";
  }
  throw Error(
    "Match: No case succesfully matched. Make exhaustive or add a wildcard case using '_'. Argument: " +
      $$gen$m0,
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ status: "open", priority: "high" }],
};

```
      
### Eval output
(kind: ok) "high_inactive"