
## Input

```javascript
// Reproduction adapted from react/react#38145.
function Component() {
  let n = 0;
  try {
    const x = 1;
  } catch (e) {
    if (e) {
      n = 1;
    }
  }
  n = n + 1;
  return n;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```

## Code

```javascript
// Reproduction adapted from react/react#38145.
function Component() {
  let n = 0;

  n = n + 1;
  return n;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) 1