
## Input

```javascript
/**
 * Fixture showing `@babel/generator` bug with jsx attribute strings containing
 * escape sequences. Note that this is only a problem when generating jsx
 * literals.
 *
 * When using the jsx transform to correctly lower jsx into
 * `React.createElement` calls, the escape sequences are preserved correctly
 * (see evaluator output).
 */
function MyApp() {
  return <input pattern="\w" />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: MyApp,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; /**
 * Fixture showing `@babel/generator` bug with jsx attribute strings containing
 * escape sequences. Note that this is only a problem when generating jsx
 * literals.
 *
 * When using the jsx transform to correctly lower jsx into
 * `React.createElement` calls, the escape sequences are preserved correctly
 * (see evaluator output).
 */
function MyApp() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <input pattern={"\\w"} />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: MyApp,
  params: [],
};

```
      
### Eval output
(kind: ok) <input pattern="\w">