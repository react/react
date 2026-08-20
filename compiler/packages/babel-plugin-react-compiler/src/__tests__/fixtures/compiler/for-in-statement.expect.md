
## Input

```javascript
function Component(props) {
  let items = [];
  for (const key in props) {
    items.push(<div key={key}>{key}</div>);
  }
  return <div>{items}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{hello: null, world: undefined, '!': true}],
  sequentialRenders: [
    {a: null, b: null, c: null},
    {lauren: true, mofei: true, sathya: true, jason: true},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props) {
    const items = [];
    for (const key in props) {
      items.push(<div key={key}>{key}</div>);
    }
    t0 = <div>{items}</div>;
    $[0] = props;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ hello: null, world: undefined, "!": true }],
  sequentialRenders: [
    { a: null, b: null, c: null },
    { lauren: true, mofei: true, sathya: true, jason: true },
  ],
};

```
      
### Eval output
(kind: ok) <div><div>a</div><div>b</div><div>c</div></div>
<div><div>lauren</div><div>mofei</div><div>sathya</div><div>jason</div></div>