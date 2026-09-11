
## Input

```javascript
// @eslintSuppressionRules:["react-hooks/rules-of-hooks"]

// The configured suppression rule is `react-hooks/rules-of-hooks`. A comment
// that disables a *different* rule which merely shares this as a prefix
// (`react-hooks/rules-of-hooks-extra`) must not be treated as a suppression
// of the configured rule.
function Component(props) {
  'use forget';
  // eslint-disable-next-line react-hooks/rules-of-hooks-extra
  return <div>{props.text}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{text: 'Hello'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @eslintSuppressionRules:["react-hooks/rules-of-hooks"]

// The configured suppression rule is `react-hooks/rules-of-hooks`. A comment
// that disables a *different* rule which merely shares this as a prefix
// (`react-hooks/rules-of-hooks-extra`) must not be treated as a suppression
// of the configured rule.
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