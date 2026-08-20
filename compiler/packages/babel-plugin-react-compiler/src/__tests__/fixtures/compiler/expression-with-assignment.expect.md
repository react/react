
## Input

```javascript
function f() {
  let x = 1;
  return x + (x = 2) + x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: f,
  params: [],
  isComponent: false,
};

```

## Code

```javascript
function f() {
  return 5;
}

export const FIXTURE_ENTRYPOINT = {
  fn: f,
  params: [],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) 5