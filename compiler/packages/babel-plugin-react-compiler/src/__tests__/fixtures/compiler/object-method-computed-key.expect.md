
## Input

```javascript
import {Stringify} from 'shared-runtime';

function Component(props) {
  const keyName = props.keyName;
  const obj = {
    [keyName]() {
      return 'dynamic';
    },
  };
  return <Stringify keys={Object.keys(obj)} value={obj[keyName]()} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{keyName: 'computedPropKey'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function Component(props) {
  const $ = _c(2);
  const keyName = props.keyName;
  let t0;
  if ($[0] !== keyName) {
    const obj = {
      [keyName]() {
        return "dynamic";
      },
    };
    t0 = <Stringify keys={Object.keys(obj)} value={obj[keyName]()} />;
    $[0] = keyName;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ keyName: "computedPropKey" }],
};

```
      
### Eval output
(kind: ok) <div>{"keys":["computedPropKey"],"value":"dynamic"}</div>