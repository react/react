
## Input

```javascript
function Foo({json}) {
  try {
    const foo = JSON.parse(json)?.foo;
    return <span>{foo}</span>;
  } catch {
    return null;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{json: '{"foo": "hello"}'}],
  sequentialRenders: [
    {json: '{"foo": "hello"}'},
    {json: '{"foo": "hello"}'},
    {json: '{"foo": "world"}'},
    {json: '{"bar": "no foo"}'},
    {json: '{}'},
    {json: 'invalid json'},
    {json: '{"foo": 42}'},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Foo(t0) {
  const $ = _c(4);
  const { json } = t0;
  try {
    let t1;
    if ($[0] !== json) {
      t1 = JSON.parse(json)?.foo;
      $[0] = json;
      $[1] = t1;
    } else {
      t1 = $[1];
    }
    const foo = t1;
    let t2;
    if ($[2] !== foo) {
      t2 = <span>{foo}</span>;
      $[2] = foo;
      $[3] = t2;
    } else {
      t2 = $[3];
    }
    return t2;
  } catch {
    return null;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{ json: '{"foo": "hello"}' }],
  sequentialRenders: [
    { json: '{"foo": "hello"}' },
    { json: '{"foo": "hello"}' },
    { json: '{"foo": "world"}' },
    { json: '{"bar": "no foo"}' },
    { json: "{}" },
    { json: "invalid json" },
    { json: '{"foo": 42}' },
  ],
};

```
      
### Eval output
(kind: ok) <span>hello</span>
<span>hello</span>
<span>world</span>
<span></span>
<span></span>
null
<span>42</span>