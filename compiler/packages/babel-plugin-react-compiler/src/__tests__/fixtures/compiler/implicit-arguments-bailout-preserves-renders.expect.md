
## Input

```javascript
// @panicThreshold:"none"

function Component(props) {
  return <div>{arguments[0].value}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [{value: 1}, {value: 2}],
};

```

## Code

```javascript
// @panicThreshold:"none"

function Component(props) {
  return <div>{arguments[0].value}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [{ value: 1 }, { value: 2 }],
};

```
      
### Eval output
(kind: ok) <div>1</div>
<div>2</div>