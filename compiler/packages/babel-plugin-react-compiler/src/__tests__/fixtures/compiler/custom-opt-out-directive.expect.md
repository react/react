
## Input

```javascript
// @expectNothingCompiled @customOptOutDirectives:["use todo memo"]
function Component() {
  'use todo memo';
  return <div>hello world!</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```

## Code

```javascript
// @expectNothingCompiled @customOptOutDirectives:["use todo memo"]
function Component() {
  "use todo memo";
  return <div>hello world!</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) <div>hello world!</div>