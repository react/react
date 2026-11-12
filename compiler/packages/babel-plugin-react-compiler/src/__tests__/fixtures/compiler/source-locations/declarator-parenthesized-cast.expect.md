
## Input

```javascript
function Component(x: unknown) {
  // prettier-ignore
  const y = (x as string);
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['hi'],
  isComponent: false,
};

```

## Code

```javascript
function Component(x) {
  const y = x as string;
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ["hi"],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) "hi"