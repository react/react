
## Input

```javascript
import {Stringify} from 'shared-runtime';

function foo() {
  const data = {
    'x\u00B2': 1,
    '\u0345': 2,
    'e\u0301': 3,
    'a\u00B7b': 4,
  };
  // Not valid identifiers: the loads must stay computed
  const superscript = 'x\u00B2';
  const combiningStart = '\u0345';
  // Valid identifiers: the loads can become property loads
  const combiningMark = 'e\u0301';
  const middleDot = 'a\u00B7b';
  return (
    <Stringify
      value={[
        data[superscript],
        data[combiningStart],
        data[combiningMark],
        data[middleDot],
      ]}
    />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function foo() {
  const $ = _c(2);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = { "x\xB2": 1, "\u0345": 2, "e\u0301": 3, "a\xB7b": 4 };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const data = t0;
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = (
      <Stringify value={[data["x\xB2"], data["\u0345"], data.é, data.a·b]} />
    );
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) <div>{"value":[1,2,3,4]}</div>