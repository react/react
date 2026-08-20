
## Input

```javascript
import fbt from 'fbt';

/**
 * Similar to error.todo-multiple-fbt-plural, but note that we must
 * count fbt plurals across both <fbt:plural /> namespaced jsx tags
 * and fbt.plural(...) call expressions.
 *
 * Evaluator error:
 *   Found differences in evaluator results
 *   Non-forget (expected):
 *   (kind: ok) <div>1 apple and 2 bananas</div>
 *   Forget:
 *   (kind: ok) <div>1 apples and 2 bananas</div>
 */
function useFoo({apples, bananas}) {
  return (
    <div>
      <fbt desc="Test Description">
        {fbt.param('number of apples', apples)}
        {'  '}
        {fbt.plural('apple', apples)} and
        {'  '}
        <fbt:plural name={'number of bananas'} count={bananas} showCount="yes">
          banana
        </fbt:plural>
      </fbt>
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{apples: 1, bananas: 2}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import fbt from "fbt";

/**
 * Similar to error.todo-multiple-fbt-plural, but note that we must
 * count fbt plurals across both <fbt:plural /> namespaced jsx tags
 * and fbt.plural(...) call expressions.
 *
 * Evaluator error:
 *   Found differences in evaluator results
 *   Non-forget (expected):
 *   (kind: ok) <div>1 apple and 2 bananas</div>
 *   Forget:
 *   (kind: ok) <div>1 apples and 2 bananas</div>
 */
function useFoo(t0) {
  const $ = _c(3);
  const { apples, bananas } = t0;
  let t1;
  if ($[0] !== apples || $[1] !== bananas) {
    t1 = (
      <div>
        {fbt._(
          {
            "*": {
              "*": "{number of apples} apples and {number of bananas} bananas",
            },
            _1: { _1: "{number of apples} apple and 1 banana" },
          },
          [
            fbt._plural(apples),
            fbt._plural(bananas, "number of bananas"),
            fbt._param("number of apples", apples),
          ],
          { hk: "2xXrUW" },
        )}
      </div>
    );
    $[0] = apples;
    $[1] = bananas;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ apples: 1, bananas: 2 }],
};

```
      