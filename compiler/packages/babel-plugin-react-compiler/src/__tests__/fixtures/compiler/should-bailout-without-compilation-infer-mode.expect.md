
## Input

```javascript
// @gating @panicThreshold:"none" @compilationMode:"infer"
let someGlobal = 'joe';

function Component() {
  someGlobal = 'wat';
  return <div>{someGlobal}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```

## Code

```javascript
// @gating @panicThreshold:"none" @compilationMode:"infer"
let someGlobal = "joe";

function Component() {
  someGlobal = "wat";
  return <div>{someGlobal}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) <div>wat</div>