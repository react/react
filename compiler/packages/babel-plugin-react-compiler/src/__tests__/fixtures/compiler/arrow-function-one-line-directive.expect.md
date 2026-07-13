
## Input

```javascript
function useFoo() {
  const update = () => {
    'worklet';
    return 1;
  };
  return update;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
  isComponent: false,
};

```

## Code

```javascript
function useFoo() {
  const update = _temp;

  return update;
}
function _temp() {
  "worklet";
  return 1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) "[[ function params=0 ]]"