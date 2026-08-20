
## Input

```javascript
// @enableJsxOutlining
function Component({arr}) {
  const x = useX();
  return (
    <>
      {arr.map((i, id) => {
        return (
          <Bar key={id} x={x}>
            <Baz i={i}>Test</Baz>
            <Foo k={i} />
          </Bar>
        );
      })}
    </>
  );
}

function Bar({x, children}) {
  return (
    <>
      {x}
      {children}
    </>
  );
}

function Baz({i, children}) {
  return (
    <>
      {i}
      {children}
    </>
  );
}

function Foo({k}) {
  return k;
}

function useX() {
  return 'x';
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{arr: ['foo', 'bar']}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableJsxOutlining
function Component(t0) {
  const $ = _c(7);
  const { arr } = t0;
  const x = useX();
  let t1;
  if ($[0] !== arr || $[1] !== x) {
    let t2;
    if ($[3] !== x) {
      t2 = (i, id) => {
        const t3 = "Test";
        const T0 = _temp;
        return <T0 i={i} t={t3} k={i} key={id} x={x} />;
      };
      $[3] = x;
      $[4] = t2;
    } else {
      t2 = $[4];
    }
    t1 = arr.map(t2);
    $[0] = arr;
    $[1] = x;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  let t2;
  if ($[5] !== t1) {
    t2 = <>{t1}</>;
    $[5] = t1;
    $[6] = t2;
  } else {
    t2 = $[6];
  }
  return t2;
}
function _temp(t0) {
  const $ = _c(9);
  const { i: i, t: t, k: k, x: x } = t0;
  let t1;
  if ($[0] !== i || $[1] !== t) {
    t1 = <Baz i={i}>{t}</Baz>;
    $[0] = i;
    $[1] = t;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  let t2;
  if ($[3] !== k) {
    t2 = <Foo k={k} />;
    $[3] = k;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  let t3;
  if ($[5] !== t1 || $[6] !== t2 || $[7] !== x) {
    t3 = (
      <Bar x={x}>
        {t1}
        {t2}
      </Bar>
    );
    $[5] = t1;
    $[6] = t2;
    $[7] = x;
    $[8] = t3;
  } else {
    t3 = $[8];
  }
  return t3;
}

function Bar(t0) {
  const $ = _c(3);
  const { x, children } = t0;
  let t1;
  if ($[0] !== children || $[1] !== x) {
    t1 = (
      <>
        {x}
        {children}
      </>
    );
    $[0] = children;
    $[1] = x;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

function Baz(t0) {
  const $ = _c(3);
  const { i, children } = t0;
  let t1;
  if ($[0] !== children || $[1] !== i) {
    t1 = (
      <>
        {i}
        {children}
      </>
    );
    $[0] = children;
    $[1] = i;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

function Foo(t0) {
  const { k } = t0;
  return k;
}

function useX() {
  return "x";
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ arr: ["foo", "bar"] }],
};

```
      
### Eval output
(kind: ok) xfooTestfooxbarTestbar