
## Input

```javascript
// @script
const React = require('react');

function Component(props) {
  return <div>{props.name}</div>;
}

// To work with snap evaluator
exports = {
  FIXTURE_ENTRYPOINT: {
    fn: Component,
    params: [{name: 'React Compiler'}],
  },
};

```

## Code

```javascript
const { c: _c } = require("react/compiler-runtime"); // @script
const React = require("react");

function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.name) {
    t0 = <div>{props.name}</div>;
    $[0] = props.name;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

// To work with snap evaluator
exports = {
  FIXTURE_ENTRYPOINT: {
    fn: Component,
    params: [{ name: "React Compiler" }],
  },
};

```
      
### Eval output
(kind: ok) <div>React Compiler</div>