
## Input

```javascript
// @eslintSuppressionRules:["my-plugin/react.rule"]

// The configured suppression rule name contains a literal `.`. It should be
// matched literally rather than treated as a regex wildcard, so a comment
// disabling `my-plugin/reactXrule` must not be treated as a suppression of
// the configured `my-plugin/react.rule`.
function Component(props) {
  'use forget';
  // eslint-disable-next-line my-plugin/reactXrule
  return <div>{props.text}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{text: 'Hello'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @eslintSuppressionRules:["my-plugin/react.rule"]

// The configured suppression rule name contains a literal `.`. It should be
// matched literally rather than treated as a regex wildcard, so a comment
// disabling `my-plugin/reactXrule` must not be treated as a suppression of
// the configured `my-plugin/react.rule`.
function Component(props) {
  "use forget";
  const $ = _c(2);
  let t0;
  if ($[0] !== props.text) {
    t0 = <div>{props.text}</div>;
    $[0] = props.text;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ text: "Hello" }],
};

```
      
### Eval output
(kind: ok) <div>Hello</div>