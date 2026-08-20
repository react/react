
## Input

```javascript
const someGlobal = true;
export default function Component(props) {
  const {b} = props;
  const items = [];
  let i = 0;
  while (i < 10) {
    if (someGlobal) {
      items.push(<div key={i}>{b}</div>);
      i++;
    }
  }
  return <>{items}</>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{b: 42}],
  sequentialRenders: [
    {b: 0},
    {b: 0},
    {b: 42},
    {b: 42},
    {b: 0},
    {b: 42},
    {b: 0},
    {b: 42},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
const someGlobal = true;
export default function Component(props) {
  const $ = _c(2);
  const { b } = props;
  let t0;
  if ($[0] !== b) {
    const items = [];
    let i = 0;
    while (i < 10) {
      if (someGlobal) {
        items.push(<div key={i}>{b}</div>);
        i++;
      }
    }
    t0 = <>{items}</>;
    $[0] = b;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ b: 42 }],
  sequentialRenders: [
    { b: 0 },
    { b: 0 },
    { b: 42 },
    { b: 42 },
    { b: 0 },
    { b: 42 },
    { b: 0 },
    { b: 42 },
  ],
};

```
      
### Eval output
(kind: ok) <div>0</div><div>0</div><div>0</div><div>0</div><div>0</div><div>0</div><div>0</div><div>0</div><div>0</div><div>0</div>
<div>0</div><div>0</div><div>0</div><div>0</div><div>0</div><div>0</div><div>0</div><div>0</div><div>0</div><div>0</div>
<div>42</div><div>42</div><div>42</div><div>42</div><div>42</div><div>42</div><div>42</div><div>42</div><div>42</div><div>42</div>
<div>42</div><div>42</div><div>42</div><div>42</div><div>42</div><div>42</div><div>42</div><div>42</div><div>42</div><div>42</div>
<div>0</div><div>0</div><div>0</div><div>0</div><div>0</div><div>0</div><div>0</div><div>0</div><div>0</div><div>0</div>
<div>42</div><div>42</div><div>42</div><div>42</div><div>42</div><div>42</div><div>42</div><div>42</div><div>42</div><div>42</div>
<div>0</div><div>0</div><div>0</div><div>0</div><div>0</div><div>0</div><div>0</div><div>0</div><div>0</div><div>0</div>
<div>42</div><div>42</div><div>42</div><div>42</div><div>42</div><div>42</div><div>42</div><div>42</div><div>42</div><div>42</div>