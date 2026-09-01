
## Input

```javascript
import {createContext, useContext} from 'react';
import {Stringify} from 'shared-runtime';

const FooContext = createContext({current: true});

function Component(props) {
  const foo = useContext(FooContext);

  const getValue = () => {
    if (foo.current) {
      return {};
    } else {
      return null;
    }
  };
  const value = getValue();

  return <Stringify value={value} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { createContext, useContext } from "react";
import { Stringify } from "shared-runtime";

const FooContext = createContext({ current: true });

function Component(props) {
  const $ = _c(4);
  const foo = useContext(FooContext);
  let t0;
  if ($[0] !== foo.current) {
    const getValue = () => {
      if (foo.current) {
        return {};
      } else {
        return null;
      }
    };
    t0 = getValue();
    $[0] = foo.current;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const value = t0;
  let t1;
  if ($[2] !== value) {
    t1 = <Stringify value={value} />;
    $[2] = value;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div>{"value":{}}</div>