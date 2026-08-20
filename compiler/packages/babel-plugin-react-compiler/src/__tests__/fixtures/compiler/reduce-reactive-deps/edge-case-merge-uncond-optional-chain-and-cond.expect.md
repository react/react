
## Input

```javascript
import {identity} from 'shared-runtime';

/**
 * Evaluator failure:
 * Found differences in evaluator results
 *   Non-forget (expected):
 *   (kind: ok) {}
 *   [[ (exception in render) TypeError: Cannot read properties of null (reading 'title_text') ]]
 *   Forget:
 *   (kind: ok) {}
 *   {}
 */
/**
 * Very contrived text fixture showing that it's technically incorrect to merge
 * a conditional dependency (e.g. dep.path in `cond ? dep.path : ...`) and an
 * unconditionally evaluated optional chain (`dep?.path`).
 *
 *
 * when screen is non-null, useFoo returns { title: null } or "(not null)"
 * when screen is null, useFoo throws
 */
function useFoo({screen}: {screen: null | undefined | {title_text: null}}) {
  return screen?.title_text != null
    ? '(not null)'
    : identity({title: screen.title_text});
}
export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{screen: null}],
  sequentialRenders: [{screen: {title_bar: undefined}}, {screen: null}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity } from "shared-runtime";

/**
 * Evaluator failure:
 * Found differences in evaluator results
 *   Non-forget (expected):
 *   (kind: ok) {}
 *   [[ (exception in render) TypeError: Cannot read properties of null (reading 'title_text') ]]
 *   Forget:
 *   (kind: ok) {}
 *   {}
 */
/**
 * Very contrived text fixture showing that it's technically incorrect to merge
 * a conditional dependency (e.g. dep.path in `cond ? dep.path : ...`) and an
 * unconditionally evaluated optional chain (`dep?.path`).
 *
 *
 * when screen is non-null, useFoo returns { title: null } or "(not null)"
 * when screen is null, useFoo throws
 */
function useFoo(t0) {
  const $ = _c(2);
  const { screen } = t0;
  let t1;
  if ($[0] !== screen) {
    t1 =
      screen?.title_text != null
        ? "(not null)"
        : identity({ title: screen.title_text });
    $[0] = screen;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ screen: null }],
  sequentialRenders: [{ screen: { title_bar: undefined } }, { screen: null }],
};

```
      
### Eval output
(kind: ok) {}
[[ (exception in render) TypeError: Cannot read properties of null (reading 'title_text') ]]