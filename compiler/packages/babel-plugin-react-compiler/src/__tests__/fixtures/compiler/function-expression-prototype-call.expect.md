
## Input

```javascript
function Component(props) {
  const f = function () {
    return <div>{props.name}</div>;
  };
  return f.call();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{name: 'Jason'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props) {
    const f = function () {
      return <div>{props.name}</div>;
    };
    t0 = f.call();
    $[0] = props;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ name: "Jason" }],
};

```
      
### Eval output
(kind: ok) <div>Jason</div>