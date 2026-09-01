
## Input

```javascript
// @expectNothingCompiled
function Component() {
  'use no forget';
  return <div>Hello World</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: true,
};

```

## Code

```javascript
// @expectNothingCompiled
function Component() {
  "use no forget";
  return <div>Hello World</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: true,
};

```
      
### Eval output
(kind: ok) <div>Hello World</div>