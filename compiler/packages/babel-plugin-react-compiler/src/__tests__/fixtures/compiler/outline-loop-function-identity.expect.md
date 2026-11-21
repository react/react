
## Input

```javascript
// A function declared inside a loop is evaluated once per iteration, so
// outlining it to a single module-scope function makes every iteration share
// the same object.

function Component() {
  const handlers = [];
  for (let i = 0; i < 2; i++) {
    handlers.push(() => 1);
  }
  return handlers[0] === handlers[1] ? 'same' : 'different';
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```

## Code

```javascript
// A function declared inside a loop is evaluated once per iteration, so
// outlining it to a single module-scope function makes every iteration share
// the same object.

function Component() {
  const handlers = [];
  for (let i = 0; i < 2; i++) {
    handlers.push(() => 1);
  }

  return handlers[0] === handlers[1] ? "same" : "different";
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) "different"