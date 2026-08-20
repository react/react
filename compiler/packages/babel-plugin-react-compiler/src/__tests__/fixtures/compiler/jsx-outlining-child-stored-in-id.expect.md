
## Input

```javascript
// @enableJsxOutlining
function Component({arr}) {
  const x = useX();
  return arr.map(i => {
    <>
      {arr.map((i, id) => {
        let child = (
          <Bar x={x}>
            <Baz i={i}></Baz>
          </Bar>
        );

        let jsx = <div>{child}</div>;
        return jsx;
      })}
    </>;
  });
}

function Bar({x, children}) {
  return (
    <>
      {x}
      {children}
    </>
  );
}

function Baz({i}) {
  return <>{i}</>;
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
  const $ = _c(3);
  const { arr } = t0;
  const x = useX();
  let t1;
  if ($[0] !== arr || $[1] !== x) {
    t1 = arr.map((i) => {
      arr.map((i_0, id) => {
        const T0 = _temp;
        const child = <T0 i={i_0} x={x} />;

        const jsx = <div>{child}</div>;
        return jsx;
      });
    });
    $[0] = arr;
    $[1] = x;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}
function _temp(t0) {
  const $ = _c(5);
  const { i: i, x: x } = t0;
  let t1;
  if ($[0] !== i) {
    t1 = <Baz i={i} />;
    $[0] = i;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  let t2;
  if ($[2] !== t1 || $[3] !== x) {
    t2 = <Bar x={x}>{t1}</Bar>;
    $[2] = t1;
    $[3] = x;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  return t2;
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
  const $ = _c(2);
  const { i } = t0;
  let t1;
  if ($[0] !== i) {
    t1 = <>{i}</>;
    $[0] = i;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
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
(kind: ok) [null,null]