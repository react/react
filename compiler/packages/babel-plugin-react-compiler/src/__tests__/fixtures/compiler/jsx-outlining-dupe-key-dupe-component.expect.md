
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
            <Foo k={i + 'i'}></Foo>
            <Foo k={i + 'j'}></Foo>
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
        const T0 = _temp;
        return <T0 k={i + "i"} k1={i + "j"} key={id} x={x} />;
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
  const $ = _c(8);
  const { k: k, k1: k1, x: x } = t0;
  let t1;
  if ($[0] !== k) {
    t1 = <Foo k={k} />;
    $[0] = k;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  let t2;
  if ($[2] !== k1) {
    t2 = <Foo k={k1} />;
    $[2] = k1;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  let t3;
  if ($[4] !== t1 || $[5] !== t2 || $[6] !== x) {
    t3 = (
      <Bar x={x}>
        {t1}
        {t2}
      </Bar>
    );
    $[4] = t1;
    $[5] = t2;
    $[6] = x;
    $[7] = t3;
  } else {
    t3 = $[7];
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
(kind: ok) xfooifoojxbaribarj