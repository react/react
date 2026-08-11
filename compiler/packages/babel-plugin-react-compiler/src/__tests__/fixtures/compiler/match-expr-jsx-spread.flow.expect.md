
## Input

```javascript
// @flow
// Match expression with JSX spread attribute inside an arm.
// The spread attribute ({...props}) references a captured variable from the
// outer component scope. collect_identifier_positions_from_expr must handle
// JSXSpreadAttribute to detect this capture.

export default component MatchExprJsxSpread(
  label: ?{outcome: string},
  ...props: {color?: string}
) {
  return match (label?.outcome) {
    'A' => <div color="green" {...props} />,
    _ => <div color="gray" {...props} />,
  };
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";

export default function MatchExprJsxSpread(t0) {
  const $ = _c(8);
  let label;
  let props;
  if ($[0] !== t0) {
    ({ label, ...props } = t0);
    $[0] = t0;
    $[1] = label;
    $[2] = props;
  } else {
    label = $[1];
    props = $[2];
  }
  let t1;
  if ($[3] !== props) {
    t1 = ($$gen$m0) => {
      if ($$gen$m0 === "A") {
        return <div color="green" {...props} />;
      }
      return <div color="gray" {...props} />;
    };
    $[3] = props;
    $[4] = t1;
  } else {
    t1 = $[4];
  }
  const t2 = label?.outcome;
  let t3;
  if ($[5] !== t1 || $[6] !== t2) {
    t3 = t1(t2);
    $[5] = t1;
    $[6] = t2;
    $[7] = t3;
  } else {
    t3 = $[7];
  }
  return t3;
}

```
      
### Eval output
(kind: exception) Fixture not implemented