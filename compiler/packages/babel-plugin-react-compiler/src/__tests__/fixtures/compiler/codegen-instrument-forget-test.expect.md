
## Input

```javascript
// @enableEmitInstrumentForget @compilationMode:"annotation"

function Bar(props) {
  'use forget';
  return <div>{props.bar}</div>;
}

function NoForget(props) {
  return <Bar>{props.noForget}</Bar>;
}

function Foo(props) {
  'use forget';
  return <Foo>{props.bar}</Foo>;
}

```

## Code

```javascript
import { shouldInstrument, useRenderCounter } from "react-compiler-runtime";
import { c as _c } from "react/compiler-runtime"; // @enableEmitInstrumentForget @compilationMode:"annotation"

function Bar(props) {
  "use forget";
  if (DEV && shouldInstrument)
    useRenderCounter("Bar", "/codegen-instrument-forget-test.ts");
  const $ = _c(2);
  let t0;
  if ($[0] !== props.bar) {
    t0 = <div>{props.bar}</div>;
    $[0] = props.bar;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

function NoForget(props) {
  return <Bar>{props.noForget}</Bar>;
}

function Foo(props) {
  "use forget";
  if (DEV && shouldInstrument)
    useRenderCounter("Foo", "/codegen-instrument-forget-test.ts");
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
      