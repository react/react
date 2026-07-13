
## Input

```javascript
// @flow @enableJsxOutlining
// Match expression inside a component with JSX outlining enabled.
// Hermes desugars match into a synthetic arrow with parameter $$gen$m0 at
// position 0. When JSX outlining moves this into an outlined _temp function,
// $$gen$m0 must NOT get a $0 suffix from rename_variables — it is a local
// parameter, not a global.

export default component MatchExprOutlinedJsx(
  item: ?{status: string},
  label: string
) {
  return (
    <div>
      {
        match (item?.status) {
          'active' => <span>{label}</span>,
          _ => <span>{'none'}</span>,
        }
      }
    </div>
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";

export default function MatchExprOutlinedJsx(t0) {
  const $ = _c(5);
  const { item, label } = t0;
  let t1;
  if ($[0] !== label) {
    t1 = ($$gen$m0) => {
      if ($$gen$m0 === "active") {
        return <span>{label}</span>;
      }
      return <span>{"none"}</span>;
    };
    $[0] = label;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const t2 = item?.status;
  let t3;
  if ($[2] !== t1 || $[3] !== t2) {
    t3 = <div>{t1(t2)}</div>;
    $[2] = t1;
    $[3] = t2;
    $[4] = t3;
  } else {
    t3 = $[4];
  }
  return t3;
}

```
      
### Eval output
(kind: exception) Fixture not implemented