
## Input

```javascript
import {useState} from 'react';
import {Stringify} from 'shared-runtime';

// This is a translation of the original merge-consecutive-scopes which uses plain objects
// to describe the UI instead of JSX. The JSXText elements in that fixture happen to
// prevent scome scopes from merging, which concealed a bug with the merging logic.
// By avoiding JSX we eliminate extraneous instructions and more accurately test the merging.
function Component(props) {
  let [state, setState] = useState(0);
  return [
    {component: Stringify, props: {text: 'Counter'}},
    {component: 'span', props: {children: [state]}},
    {
      component: 'button',
      props: {
        'data-testid': 'button',
        onClick: () => setState(state + 1),
        children: ['increment'],
      },
    },
  ];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useState } from "react";
import { Stringify } from "shared-runtime";

// This is a translation of the original merge-consecutive-scopes which uses plain objects
// to describe the UI instead of JSX. The JSXText elements in that fixture happen to
// prevent scome scopes from merging, which concealed a bug with the merging logic.
// By avoiding JSX we eliminate extraneous instructions and more accurately test the merging.
function Component(props) {
  const $ = _c(11);
  const [state, setState] = useState(0);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = { component: Stringify, props: { text: "Counter" } };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  let t1;
  if ($[1] !== state) {
    t1 = { component: "span", props: { children: [state] } };
    $[1] = state;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  let t2;
  if ($[3] !== state) {
    t2 = () => setState(state + 1);
    $[3] = state;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  let t3;
  if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = ["increment"];
    $[5] = t3;
  } else {
    t3 = $[5];
  }
  let t4;
  if ($[6] !== t2) {
    t4 = {
      component: "button",
      props: { "data-testid": "button", onClick: t2, children: t3 },
    };
    $[6] = t2;
    $[7] = t4;
  } else {
    t4 = $[7];
  }
  let t5;
  if ($[8] !== t1 || $[9] !== t4) {
    t5 = [t0, t1, t4];
    $[8] = t1;
    $[9] = t4;
    $[10] = t5;
  } else {
    t5 = $[10];
  }
  return t5;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) [{"component":"[[ function params=1 ]]","props":{"text":"Counter"}},{"component":"span","props":{"children":[0]}},{"component":"button","props":{"data-testid":"button","onClick":"[[ function params=0 ]]","children":["increment"]}}]