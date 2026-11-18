
## Input

```javascript
// Outlining a capture-free function that is declared inside a nested function
// makes every call return the same object, since the outlined function is
// created once at module scope. `makeHandler()` is called twice per render and
// must return a distinct function each time.

function Component() {
  function makeHandler() {
    return () => 1;
  }
  const a = makeHandler();
  const b = makeHandler();
  return a === b ? 'same' : 'different';
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```

## Code

```javascript
// Outlining a capture-free function that is declared inside a nested function
// makes every call return the same object, since the outlined function is
// created once at module scope. `makeHandler()` is called twice per render and
// must return a distinct function each time.

function Component() {
  const makeHandler = function makeHandler() {
    return () => 1;
  };

  const a = makeHandler();
  const b = makeHandler();
  return a === b ? "same" : "different";
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) "different"