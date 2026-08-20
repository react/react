
## Input

```javascript
import {Throw} from 'shared-runtime';

/**
 * Note: this is disabled in the evaluator due to different devmode errors.
 * Found differences in evaluator results
 *  Non-forget (expected):
 *  (kind: ok) <invalidtag val="[object Object]"></invalidtag>
 *  logs: ['Warning: <%s /> is using incorrect casing. Use PascalCase for React components, or lowercase for HTML elements.%s','invalidTag']
 *
 *  Forget:
 *  (kind: ok) <invalidtag val="[object Object]"></invalidtag>
 *  logs: [
 *   'Warning: <%s /> is using incorrect casing. Use PascalCase for React components, or lowercase for HTML elements.%s','invalidTag',
 *   'Warning: The tag <%s> is unrecognized in this browser. If you meant to render a React component, start its name with an uppercase letter.%s','invalidTag',
 *  ]
 */
function useFoo() {
  const invalidTag = Throw;
  /**
   * Need to be careful to not parse `invalidTag` as a localVar (i.e. render
   * Throw). Note that the jsx transform turns this into a string tag:
   * `jsx("invalidTag"...
   */
  return <invalidTag val={{val: 2}} />;
}
export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Throw } from "shared-runtime";

/**
 * Note: this is disabled in the evaluator due to different devmode errors.
 * Found differences in evaluator results
 *  Non-forget (expected):
 *  (kind: ok) <invalidtag val="[object Object]"></invalidtag>
 *  logs: ['Warning: <%s /> is using incorrect casing. Use PascalCase for React components, or lowercase for HTML elements.%s','invalidTag']
 *
 *  Forget:
 *  (kind: ok) <invalidtag val="[object Object]"></invalidtag>
 *  logs: [
 *   'Warning: <%s /> is using incorrect casing. Use PascalCase for React components, or lowercase for HTML elements.%s','invalidTag',
 *   'Warning: The tag <%s> is unrecognized in this browser. If you meant to render a React component, start its name with an uppercase letter.%s','invalidTag',
 *  ]
 */
function useFoo() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <invalidTag val={{ val: 2 }} />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};

```
      