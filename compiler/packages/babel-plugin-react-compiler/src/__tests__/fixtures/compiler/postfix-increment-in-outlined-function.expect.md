
## Input

```javascript
import {Stringify} from 'shared-runtime';

function Component(props) {
  const result = props.items.reduce(
    (acc, item) => {
      const id = acc.counter++;
      acc.nodes.push(`${id}:${item}`);
      return acc;
    },
    {counter: 0, nodes: []},
  );
  return <Stringify nodes={result.nodes} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{items: ['a', 'b', 'c']}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function Component(props) {
  const $ = _c(4);
  let t0;
  if ($[0] !== props.items) {
    t0 = props.items.reduce(
      _temp,

      { counter: 0, nodes: [] },
    );
    $[0] = props.items;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const result = t0;
  let t1;
  if ($[2] !== result.nodes) {
    t1 = <Stringify nodes={result.nodes} />;
    $[2] = result.nodes;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}
function _temp(acc, item) {
  const t0 = acc.counter;
  acc.counter = t0 + 1;
  const id = t0;
  acc.nodes.push(`${id}:${item}`);
  return acc;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ items: ["a", "b", "c"] }],
};

```
      
### Eval output
(kind: ok) <div>{"nodes":["0:a","1:b","2:c"]}</div>