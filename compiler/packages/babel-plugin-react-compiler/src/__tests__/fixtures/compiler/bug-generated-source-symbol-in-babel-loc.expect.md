
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees
import {useMemo} from 'react';

function visualFor(state, getLabels) {
  return {label: getLabels(state), tint: 'red', glyph: () => null};
}

// Repro: synthesized temporaries for destructured bindings from cross-scope
// hoisting would have their Babel AST identifier node's .loc set to the
// internal GeneratedSource Symbol sentinel instead of null, causing
// v8.serialize / jest-worker IPC failures.
export function Example({state, getLabels, colors, onTap}) {
  const session = useMemo(() => ({state}), [state]);
  if (session.state === 'off') return null;

  const handleTap = () => onTap?.(session.state);
  const {label, tint, glyph} = visualFor(session.state, getLabels);

  return (
    <button aria-label={label} onClick={handleTap} style={{background: tint}}>
      <span>
        {session.state === 'listening' ? <em>...</em> : glyph(colors.fg)}
        <span style={{color: colors.fg}}>{label}</span>
      </span>
    </button>
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees
import { useMemo } from "react";

function visualFor(state, getLabels) {
  const $ = _c(5);
  let t0;
  if ($[0] !== getLabels || $[1] !== state) {
    t0 = getLabels(state);
    $[0] = getLabels;
    $[1] = state;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  let t1;
  if ($[3] !== t0) {
    t1 = { label: t0, tint: "red", glyph: _temp };
    $[3] = t0;
    $[4] = t1;
  } else {
    t1 = $[4];
  }
  return t1;
}

// Repro: synthesized temporaries for destructured bindings from cross-scope
// hoisting would have their Babel AST identifier node's .loc set to the
// internal GeneratedSource Symbol sentinel instead of null, causing
// v8.serialize / jest-worker IPC failures.
function _temp() {
  return null;
}
export function Example(t0) {
  const $ = _c(27);
  const { state, getLabels, colors, onTap } = t0;
  let t1;
  if ($[0] !== state) {
    t1 = { state };
    $[0] = state;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const session = t1;
  if (session.state === "off") {
    return null;
  }
  let t2;
  if ($[2] !== onTap || $[3] !== session.state) {
    t2 = () => onTap?.(session.state);
    $[2] = onTap;
    $[3] = session.state;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  const handleTap = t2;
  let label;
  let t3;
  let t4;
  let t5;
  let t6;
  if (
    $[5] !== colors.fg ||
    $[6] !== getLabels ||
    $[7] !== handleTap ||
    $[8] !== session.state
  ) {
    const { label: t7, tint, glyph } = visualFor(session.state, getLabels);
    label = t7;
    t4 = label;
    t5 = handleTap;
    t6 = { background: tint };
    t3 = session.state === "listening" ? <em>...</em> : glyph(colors.fg);
    $[5] = colors.fg;
    $[6] = getLabels;
    $[7] = handleTap;
    $[8] = session.state;
    $[9] = label;
    $[10] = t3;
    $[11] = t4;
    $[12] = t5;
    $[13] = t6;
  } else {
    label = $[9];
    t3 = $[10];
    t4 = $[11];
    t5 = $[12];
    t6 = $[13];
  }
  let t7;
  if ($[14] !== colors.fg) {
    t7 = { color: colors.fg };
    $[14] = colors.fg;
    $[15] = t7;
  } else {
    t7 = $[15];
  }
  let t8;
  if ($[16] !== label || $[17] !== t7) {
    t8 = <span style={t7}>{label}</span>;
    $[16] = label;
    $[17] = t7;
    $[18] = t8;
  } else {
    t8 = $[18];
  }
  let t9;
  if ($[19] !== t3 || $[20] !== t8) {
    t9 = (
      <span>
        {t3}
        {t8}
      </span>
    );
    $[19] = t3;
    $[20] = t8;
    $[21] = t9;
  } else {
    t9 = $[21];
  }
  let t10;
  if ($[22] !== t4 || $[23] !== t5 || $[24] !== t6 || $[25] !== t9) {
    t10 = (
      <button aria-label={t4} onClick={t5} style={t6}>
        {t9}
      </button>
    );
    $[22] = t4;
    $[23] = t5;
    $[24] = t6;
    $[25] = t9;
    $[26] = t10;
  } else {
    t10 = $[26];
  }
  return t10;
}

```
      
### Eval output
(kind: exception) Fixture not implemented