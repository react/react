
## Input

```javascript
function Component(x = () => {}) {
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```

## Code

```javascript
function Component(t0) {
  const x = t0 === undefined ? _temp : t0;
  return x;
}
function _temp() {}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) "[[ function params=0 ]]"