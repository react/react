
## Input

```javascript
const useSomeHook = () => {};

const Component = () => {
  useSomeHook(() => {
    'worklet';
    return [1, 2, 3].map(() => null);
  });

  return null;
};

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: true,
};

```

## Code

```javascript
const useSomeHook = () => {};

const Component = () => {
  useSomeHook(_temp);

  return null;
};

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: true,
};
function _temp() {
  "worklet";
  return [1, 2, 3].map(() => null);
}

```
      
### Eval output
(kind: ok) null