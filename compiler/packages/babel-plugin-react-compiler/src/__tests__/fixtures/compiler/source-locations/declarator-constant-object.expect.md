
## Input

```javascript
function Component() {
  const text = 'hi';
  const {length} = text;
  return length;
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
  const { length } = "hi";
  return length;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) 2