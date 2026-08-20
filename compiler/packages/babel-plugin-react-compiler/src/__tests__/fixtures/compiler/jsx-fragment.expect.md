
## Input

```javascript
function Foo(props) {
  return (
    <>
      Hello {props.greeting}{' '}
      <div>
        <>Text</>
      </div>
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Foo(props) {
  const $ = _c(3);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = (
      <div>
        <>Text</>
      </div>
    );
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  let t1;
  if ($[1] !== props.greeting) {
    t1 = (
      <>
        Hello {props.greeting} {t0}
      </>
    );
    $[1] = props.greeting;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      