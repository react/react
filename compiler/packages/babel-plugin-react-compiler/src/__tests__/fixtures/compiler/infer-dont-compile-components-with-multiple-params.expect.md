
## Input

```javascript
// @expectNothingCompiled @compilationMode:"infer"
// Takes multiple parameters - not a component!
function Component(foo, bar) {
  return <div />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [null, null],
};

```

## Code

```javascript
// @expectNothingCompiled @compilationMode:"infer"
// Takes multiple parameters - not a component!
function Component(foo, bar) {
  return <div />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [null, null],
};

```
      
### Eval output
(kind: ok) <div></div>