
## Input

```javascript
function Component() {
  // prettier-ignore
  return (
    <div
      className="
        first second
        third
      "
      title="first
second"
      data-spaces="first  second"
      data-expression={'first\n  second'}>
      <Child value="
        first
        second
      " />
    </div>
  );
}

function Child({value}) {
  return <span>{value}</span>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = (
      <div
        className=" first second third "
        title={"first\nsecond"}
        data-spaces="first  second"
        data-expression={"first\n  second"}
      >
        <Child value=" first second " />
      </div>
    );
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

function Child(t0) {
  const $ = _c(2);
  const { value } = t0;
  let t1;
  if ($[0] !== value) {
    t1 = <span>{value}</span>;
    $[0] = value;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div class=" first second third " title="first
second" data-spaces="first  second" data-expression="first
  second"><span> first second </span></div>