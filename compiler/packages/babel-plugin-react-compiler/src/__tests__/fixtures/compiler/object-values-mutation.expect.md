
## Input

```javascript
import {makeObject_Primitives, Stringify} from 'shared-runtime';

function Component(props) {
  const object = {object: props.object};
  const entries = Object.entries(object);
  entries.map(([, value]) => {
    value.updated = true;
  });
  return <Stringify entries={entries} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{object: {key: makeObject_Primitives()}}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { makeObject_Primitives, Stringify } from "shared-runtime";

function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.object) {
    const object = { object: props.object };
    const entries = Object.entries(object);
    entries.map(_temp);
    t0 = <Stringify entries={entries} />;
    $[0] = props.object;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}
function _temp(t0) {
  const [, value] = t0;
  value.updated = true;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ object: { key: makeObject_Primitives() } }],
};

```
      
### Eval output
(kind: ok) <div>{"entries":[["object",{"key":{"a":0,"b":"value1","c":true},"updated":true}]]}</div>