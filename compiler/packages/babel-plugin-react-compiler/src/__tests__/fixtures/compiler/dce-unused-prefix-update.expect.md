
## Input

```javascript
function Component(props) {
  let i = 0;
  --i;
  i = props.i;
  return i;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{i: 42}],
};

```

## Code

```javascript
function Component(props) {
  let i;

  i = props.i;
  return i;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ i: 42 }],
};

```
      
### Eval output
(kind: ok) 42