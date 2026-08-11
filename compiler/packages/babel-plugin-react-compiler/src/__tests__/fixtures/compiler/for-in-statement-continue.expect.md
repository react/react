
## Input

```javascript
function Component(props) {
  let x;
  const object = {...props.value};
  for (const y in object) {
    if (y === 'continue') {
      continue;
    }
    x = object[y];
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: {a: 'a', continue: 'skip', b: 'hello!'}}],
  sequentialRenders: [
    {value: {a: 'a', continue: 'skip', b: 'hello!'}},
    {value: {a: 'a', continue: 'skip', b: 'hello!'}},
    {value: {a: 'skip!', continue: true}},
    {value: {a: 'a', continue: 'skip', b: 'hello!'}},
    {value: {a: 'skip!', continue: true}},
    {value: {a: 'a', continue: 'skip', b: 'hello!'}},
    {value: {a: 'skip!', continue: true}},
    {value: {a: 'skip!', continue: true}},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(2);
  let x;
  if ($[0] !== props.value) {
    const object = { ...props.value };
    for (const y in object) {
      if (y === "continue") {
        continue;
      }

      x = object[y];
    }
    $[0] = props.value;
    $[1] = x;
  } else {
    x = $[1];
  }

  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: { a: "a", continue: "skip", b: "hello!" } }],
  sequentialRenders: [
    { value: { a: "a", continue: "skip", b: "hello!" } },
    { value: { a: "a", continue: "skip", b: "hello!" } },
    { value: { a: "skip!", continue: true } },
    { value: { a: "a", continue: "skip", b: "hello!" } },
    { value: { a: "skip!", continue: true } },
    { value: { a: "a", continue: "skip", b: "hello!" } },
    { value: { a: "skip!", continue: true } },
    { value: { a: "skip!", continue: true } },
  ],
};

```
      
### Eval output
(kind: ok) "hello!"
"hello!"
"skip!"
"hello!"
"skip!"
"hello!"
"skip!"
"skip!"