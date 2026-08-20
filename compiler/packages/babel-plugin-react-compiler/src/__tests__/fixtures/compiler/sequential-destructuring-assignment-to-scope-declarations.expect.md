
## Input

```javascript
import {identity} from 'shared-runtime';

function Component(statusName) {
  const {status, text} = foo(statusName);
  const {bg, color} = getStyles(status);
  return (
    <div className={identity(bg)}>
      <span className={identity(color)}>{[text]}</span>
    </div>
  );
}

function foo(name) {
  return {
    status: `<status>`,
    text: `${name}!`,
  };
}

function getStyles(status) {
  return {
    bg: '#eee8d5',
    color: '#657b83',
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['Mofei'],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity } from "shared-runtime";

function Component(statusName) {
  const $ = _c(12);
  let t0;
  let t1;
  let text;
  if ($[0] !== statusName) {
    const { status, text: t2 } = foo(statusName);
    text = t2;
    const { bg, color } = getStyles(status);
    t1 = identity(bg);
    t0 = identity(color);
    $[0] = statusName;
    $[1] = t0;
    $[2] = t1;
    $[3] = text;
  } else {
    t0 = $[1];
    t1 = $[2];
    text = $[3];
  }
  let t2;
  if ($[4] !== text) {
    t2 = [text];
    $[4] = text;
    $[5] = t2;
  } else {
    t2 = $[5];
  }
  let t3;
  if ($[6] !== t0 || $[7] !== t2) {
    t3 = <span className={t0}>{t2}</span>;
    $[6] = t0;
    $[7] = t2;
    $[8] = t3;
  } else {
    t3 = $[8];
  }
  let t4;
  if ($[9] !== t1 || $[10] !== t3) {
    t4 = <div className={t1}>{t3}</div>;
    $[9] = t1;
    $[10] = t3;
    $[11] = t4;
  } else {
    t4 = $[11];
  }
  return t4;
}

function foo(name) {
  const $ = _c(2);

  const t0 = `${name}!`;
  let t1;
  if ($[0] !== t0) {
    t1 = { status: "<status>", text: t0 };
    $[0] = t0;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

function getStyles(status) {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = { bg: "#eee8d5", color: "#657b83" };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ["Mofei"],
};

```
      
### Eval output
(kind: ok) <div class="#eee8d5"><span class="#657b83">Mofei!</span></div>