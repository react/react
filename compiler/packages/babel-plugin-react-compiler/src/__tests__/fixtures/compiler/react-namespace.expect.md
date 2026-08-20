
## Input

```javascript
const FooContext = React.createContext({current: null});

function Component(props) {
  const foo = React.useContext(FooContext);
  const ref = React.useRef();
  const [x, setX] = React.useState(false);
  const onClick = () => {
    setX(true);
    ref.current = true;
  };
  return <div onClick={onClick}>{React.cloneElement(props.children)}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{children: <div>Hello</div>}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
const FooContext = React.createContext({ current: null });

function Component(props) {
  const $ = _c(5);
  React.useContext(FooContext);
  const ref = React.useRef();
  const [, setX] = React.useState(false);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = () => {
      setX(true);
      ref.current = true;
    };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const onClick = t0;
  let t1;
  if ($[1] !== props.children) {
    t1 = React.cloneElement(props.children);
    $[1] = props.children;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  let t2;
  if ($[3] !== t1) {
    t2 = <div onClick={onClick}>{t1}</div>;
    $[3] = t1;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ children: <div>Hello</div> }],
};

```
      
### Eval output
(kind: ok) <div><div>Hello</div></div>