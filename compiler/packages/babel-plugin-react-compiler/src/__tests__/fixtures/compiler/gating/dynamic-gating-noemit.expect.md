
## Input

```javascript
// @dynamicGating:{"source":"shared-runtime"} @outputMode:"lint"

function Foo() {
  'use memo if(getTrue)';
  return <div>hello world</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};

```

## Code

```javascript
// @dynamicGating:{"source":"shared-runtime"} @outputMode:"lint"

function Foo() {
  "use memo if(getTrue)";
  return <div>hello world</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div>hello world</div>