
## Input

```javascript
function component() {
  let x = function (a) {
    a.foo();
  };
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: [],
  isComponent: false,
};

```

## Code

```javascript
function component() {
  const x = _temp;

  return x;
}
function _temp(a) {
  a.foo();
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: [],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) "[[ function params=1 ]]"