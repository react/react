
## Input

```javascript
// note: comments are for the ideal scopes, not what is currently
// emitted
function foo(props) {
  // scope 0: deps=[props.a] decl=[x] reassign=none
  let x = [];
  x.push(props.a);

  // scope 1: deps=[x] decl=[header] reassign=none
  const header = props.showHeader ? <div>{x}</div> : null;

  // scope 2:
  // deps=[x, props.b, props.c]
  // decl=none
  // reassign=[x]
  const y = [x]; // y depends on the earlier x
  x = []; // x reassigned
  y.push(props.b); // interleaved mutation of x/y
  x.push(props.c); // interleaved mutation

  // scope 3 ...
  const content = (
    <div>
      {x}
      {y}
    </div>
  );

  // scope 4 ...
  return (
    <>
      {header}
      {content}
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // note: comments are for the ideal scopes, not what is currently
// emitted
function foo(props) {
  const $ = _c(16);
  let x;
  if ($[0] !== props.a) {
    x = [];
    x.push(props.a);
    $[0] = props.a;
    $[1] = x;
  } else {
    x = $[1];
  }
  let t0;
  if ($[2] !== props.showHeader || $[3] !== x) {
    t0 = props.showHeader ? <div>{x}</div> : null;
    $[2] = props.showHeader;
    $[3] = x;
    $[4] = t0;
  } else {
    t0 = $[4];
  }
  const header = t0;
  let y;
  if ($[5] !== props.b || $[6] !== props.c || $[7] !== x) {
    y = [x];
    x = [];
    y.push(props.b);
    x.push(props.c);
    $[5] = props.b;
    $[6] = props.c;
    $[7] = x;
    $[8] = y;
    $[9] = x;
  } else {
    y = $[8];
    x = $[9];
  }
  let t1;
  if ($[10] !== x || $[11] !== y) {
    t1 = (
      <div>
        {x}
        {y}
      </div>
    );
    $[10] = x;
    $[11] = y;
    $[12] = t1;
  } else {
    t1 = $[12];
  }
  const content = t1;
  let t2;
  if ($[13] !== content || $[14] !== header) {
    t2 = (
      <>
        {header}
        {content}
      </>
    );
    $[13] = content;
    $[14] = header;
    $[15] = t2;
  } else {
    t2 = $[15];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      