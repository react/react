
## Input

```javascript
export const Badge = ({variant = "primary", ...rest}) => {
  const className = `badge badge-${variant}`;
  return <div className={className} {...rest} />;
};

export const FIXTURE_ENTRYPOINT = {
  fn: Badge,
  params: [{variant: undefined, title: "Hello"}],
  isComponent: true,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
export const Badge = (t0) => {
  const $ = _c(6);
  let rest;
  let t1;
  if ($[0] !== t0) {
    ({ variant: t1, ...rest } = t0);
    $[0] = t0;
    $[1] = rest;
    $[2] = t1;
  } else {
    rest = $[1];
    t1 = $[2];
  }
  const variant = t1 === undefined ? "primary" : t1;
  const className = `badge badge-${variant}`;
  let t2;
  if ($[3] !== className || $[4] !== rest) {
    t2 = <div className={className} {...rest} />;
    $[3] = className;
    $[4] = rest;
    $[5] = t2;
  } else {
    t2 = $[5];
  }
  return t2;
};

export const FIXTURE_ENTRYPOINT = {
  fn: Badge,
  params: [{ variant: undefined, title: "Hello" }],
  isComponent: true,
};

```
      
### Eval output
(kind: ok) <div class="badge badge-primary" title="Hello"></div>