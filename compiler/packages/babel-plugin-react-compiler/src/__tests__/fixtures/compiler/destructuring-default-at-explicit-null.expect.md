
## Input

```javascript
function Component(props) {
  // destructure slot index has an explicit null in the input, should return null (not the default)
  const [x = 42] = props.value;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: [null]}],
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
  params: [{ value: [null] }],
};

```
      
### Eval output
(kind: ok) null