
## Input

```javascript
let b = 1;

export default function useMyHook() {
  const fn = () => {
    b = 2;
  };
  return fn;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useMyHook,
  params: [],
};

```

## Code

```javascript
let b = 1;

export default function useMyHook() {
  const fn = _temp;

  return fn;
}
function _temp() {
  b = 2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useMyHook,
  params: [],
};

```
      
### Eval output
(kind: ok) "[[ function params=0 ]]"