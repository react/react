
## Input

```javascript
function Component() {
  const namespace = useParams()['namespace'];
  return <div>{namespace}</div>;
}

function OtherComponent(props) {
  return <div>{props['external']}</div>;
}

function ConstantKeyComponent(props) {
  const key = 'external';
  return <div>{props[key]}</div>;
}

function OptionalComponent(props) {
  return <div>{props?.['external']}</div>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component() {
  const $ = _c(2);
  const namespace = useParams()["namespace"];
  let t0;
  if ($[0] !== namespace) {
    t0 = <div>{namespace}</div>;
    $[0] = namespace;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

function OtherComponent(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props["external"]) {
    t0 = <div>{props["external"]}</div>;
    $[0] = props["external"];
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

function ConstantKeyComponent(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props["external"]) {
    t0 = <div>{props["external"]}</div>;
    $[0] = props["external"];
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

function OptionalComponent(props) {
  const $ = _c(2);
  const t0 = props?.["external"];
  let t1;
  if ($[0] !== t0) {
    t1 = <div>{t0}</div>;
    $[0] = t0;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

```
      
### Eval output
(kind: exception) Fixture not implemented