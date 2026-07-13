
## Input

```javascript
// @expectNothingCompiled @compilationMode:"infer"
function Component(props) {
  const ignore = <foo />;
  return {foo: f(props)};
}

function f(props) {
  return props;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
// @expectNothingCompiled @compilationMode:"infer"
function Component(props) {
  const ignore = <foo />;
  return { foo: f(props) };
}

function f(props) {
  return props;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) {"foo":{}}