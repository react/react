
## Input

```javascript
// @eslintSuppressionRules:[]

// The suppression here shouldn't cause compilation to get skipped
// Previously we had a bug where an empty list of suppressions would
// create a regexp that matched any suppression
function Component(props) {
  'use forget';
  // eslint-disable-next-line foo/not-react-related
  return <div>{props.text}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{text: 'Hello'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @eslintSuppressionRules:[]

// The suppression here shouldn't cause compilation to get skipped
// Previously we had a bug where an empty list of suppressions would
// create a regexp that matched any suppression
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