
## Input

```javascript
// note: comments are for the ideal scopes, not what is currently
// emitted
function foo(props) {
  // scope 0: deps=[props.a] decl=[x] reassign=none
  let x = [];
  x.push(props.a);

  // scope 1: deps=[x] decl=[header] reassign=none
  const header = <div>{x}</div>;

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
  const $ = _c(14);
  let t0;
  let x;
  if ($[0] !== props.a) {
    x = [];
    x.push(props.a);
    t0 = <div>{x}</div>;
    $[0] = props.a;
    $[1] = t0;
    $[2] = x;
  } else {
    t0 = $[1];
    x = $[2];
  }
  const header = t0;
  let y;
  if ($[3] !== props.b || $[4] !== props.c || $[5] !== x) {
    y = [x];
    x = [];
    y.push(props.b);
    x.push(props.c);
    $[3] = props.b;
    $[4] = props.c;
    $[5] = x;
    $[6] = y;
    $[7] = x;
  } else {
    y = $[6];
    x = $[7];
  }
  let t1;
  if ($[8] !== x || $[9] !== y) {
    t1 = (
      <div>
        {x}
        {y}
      </div>
    );
    $[8] = x;
    $[9] = y;
    $[10] = t1;
  } else {
    t1 = $[10];
  }
  const content = t1;
  let t2;
  if ($[11] !== content || $[12] !== header) {
    t2 = (
      <>
        {header}
        {content}
      </>
    );
    $[11] = content;
    $[12] = header;
    $[13] = t2;
  } else {
    t2 = $[13];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      