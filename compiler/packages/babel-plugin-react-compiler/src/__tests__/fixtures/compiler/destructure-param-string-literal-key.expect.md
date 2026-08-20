
## Input

```javascript
function foo({data: dataTestID}) {
  return dataTestID;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [{data: {}}],
  isComponent: false,
};

```

## Code

```javascript
function foo(t0) {
  const { data: dataTestID } = t0;
  return dataTestID;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [{ data: {} }],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) {}