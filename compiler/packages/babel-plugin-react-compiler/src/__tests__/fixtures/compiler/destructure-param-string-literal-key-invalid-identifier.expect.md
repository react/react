
## Input

```javascript
function foo({'data-foo-bar': dataTestID}) {
  return dataTestID;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [{'data-foo-bar': {}}],
  isComponent: false,
};

```

## Code

```javascript
function foo(t0) {
  const { "data-foo-bar": dataTestID } = t0;
  return dataTestID;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [{ "data-foo-bar": {} }],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) {}