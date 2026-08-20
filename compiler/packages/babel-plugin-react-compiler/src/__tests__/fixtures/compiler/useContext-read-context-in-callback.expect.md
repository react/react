
## Input

```javascript
import {createContext, useContext} from 'react';

const FooContext = createContext({current: null});

function Component(props) {
  const foo = useContext(FooContext);
  // This function should be memoized since it is only reading the context value
  const onClick = () => {
    console.log(foo.current);
  };
  return <div onClick={onClick}>{props.children}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{children: <div>Hello</div>}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { createContext, useContext } from "react";

const FooContext = createContext({ current: null });

function Component(props) {
  const $ = _c(5);
  const foo = useContext(FooContext);
  let t0;
  if ($[0] !== foo.current) {
    t0 = () => {
      console.log(foo.current);
    };
    $[0] = foo.current;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const onClick = t0;
  let t1;
  if ($[2] !== onClick || $[3] !== props.children) {
    t1 = <div onClick={onClick}>{props.children}</div>;
    $[2] = onClick;
    $[3] = props.children;
    $[4] = t1;
  } else {
    t1 = $[4];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ children: <div>Hello</div> }],
};

```
      
### Eval output
(kind: ok) <div><div>Hello</div></div>