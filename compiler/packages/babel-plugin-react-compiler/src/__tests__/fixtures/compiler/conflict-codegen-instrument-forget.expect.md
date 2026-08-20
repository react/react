
## Input

```javascript
// @enableEmitInstrumentForget @compilationMode:"annotation"

import {identity} from 'shared-runtime';

function Bar(props) {
  'use forget';
  const shouldInstrument = identity(null);
  const _shouldInstrument = identity(null);
  const _x2 = () => {
    const _shouldInstrument2 = 'hello world';
    return identity({_shouldInstrument2});
  };
  return (
    <div style={shouldInstrument} other={_shouldInstrument}>
      {props.bar}
    </div>
  );
}

function Foo(props) {
  'use forget';
  return <Foo>{props.bar}</Foo>;
}

```

## Code

```javascript
import {
  shouldInstrument as _shouldInstrument3,
  useRenderCounter,
} from "react-compiler-runtime";
import { c as _c } from "react/compiler-runtime"; // @enableEmitInstrumentForget @compilationMode:"annotation"

import { identity } from "shared-runtime";

function Bar(props) {
  "use forget";
  if (DEV && _shouldInstrument3)
    useRenderCounter("Bar", "/conflict-codegen-instrument-forget.ts");
  const $ = _c(4);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = identity(null);
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const shouldInstrument = t0;
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = identity(null);
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const _shouldInstrument = t1;
  let t2;
  if ($[2] !== props.bar) {
    t2 = (
      <div style={shouldInstrument} other={_shouldInstrument}>
        {props.bar}
      </div>
    );
    $[2] = props.bar;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  return t2;
}

function Foo(props) {
  "use forget";
  if (DEV && _shouldInstrument3)
    useRenderCounter("Foo", "/conflict-codegen-instrument-forget.ts");
  const $ = _c(2);
  let t0;
  if ($[0] !== props.bar) {
    t0 = <Foo>{props.bar}</Foo>;
    $[0] = props.bar;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

```
      
### Eval output
(kind: exception) Fixture not implemented