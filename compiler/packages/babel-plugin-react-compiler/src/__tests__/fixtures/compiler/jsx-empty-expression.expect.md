
## Input

```javascript
export function Component(props) {
  return (
    <div>
      {}
      {props.a}
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 'hello'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
export function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.a) {
    t0 = <div>{props.a}</div>;
    $[0] = props.a;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: "hello" }],
};

```
      