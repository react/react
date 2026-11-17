
## Input

```javascript
import {useRef} from 'react';

function useRefs() {
  return {first: useRef(0), second: useRef(0)};
}

function useRefAndValue(props) {
  return {ref: useRef(null), value: props.value};
}

function Component(props) {
  const {ref, value} = useRefAndValue(props);
  return (
    <div ref={ref}>
      {value}
      {props.children}
    </div>
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useRef } from "react";

function useRefs() {
  const $ = _c(3);
  const t0 = useRef(0);
  const t1 = useRef(0);
  let t2;
  if ($[0] !== t0 || $[1] !== t1) {
    t2 = { first: t0, second: t1 };
    $[0] = t0;
    $[1] = t1;
    $[2] = t2;
  } else {
    t2 = $[2];
  }
  return t2;
}

function useRefAndValue(props) {
  const $ = _c(3);
  const t0 = useRef(null);
  let t1;
  if ($[0] !== props.value || $[1] !== t0) {
    t1 = { ref: t0, value: props.value };
    $[0] = props.value;
    $[1] = t0;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

function Component(props) {
  const $ = _c(4);
  const { ref, value } = useRefAndValue(props);
  let t0;
  if ($[0] !== props.children || $[1] !== ref || $[2] !== value) {
    t0 = (
      <div ref={ref}>
        {value}
        {props.children}
      </div>
    );
    $[0] = props.children;
    $[1] = ref;
    $[2] = value;
    $[3] = t0;
  } else {
    t0 = $[3];
  }
  return t0;
}

```
      
### Eval output
(kind: exception) Fixture not implemented