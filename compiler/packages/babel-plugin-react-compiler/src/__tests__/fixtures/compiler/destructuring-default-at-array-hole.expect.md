
## Input

```javascript
function Component(props) {
  // destructure slot index has a hole in the input, should return default
  const [x = 42] = props.value;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: [, /* hole! */ 3.14]}],
};

```

## Code

```javascript
function Component(props) {
  const [t0] = props.value;
  const x = t0 === undefined ? 42 : t0;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: [, /* hole! */ 3.14] }],
};

```
      
### Eval output
(kind: ok) 42