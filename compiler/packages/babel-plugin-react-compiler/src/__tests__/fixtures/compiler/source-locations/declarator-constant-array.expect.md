
## Input

```javascript
function Component() {
  const text = 'hi';
  const [first] = text;
  return first;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};

```

## Code

```javascript
function Component() {
  const [first] = "hi";
  return first;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) "h"