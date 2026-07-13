
## Input

```javascript
import {arrayPush, CONST_NUMBER0, mutate} from 'shared-runtime';

/**
 * Repro for bug in our type inference system. We currently propagate inferred
 * types through control flow / potential type guards. Note that this is
 * inconsistent with both Flow and Typescript.
 * https://flow.org/try/#1N4Igxg9gdgZglgcxALlAIwIZoKYBsD6uEEAztvhgE6UYCe+JADpdhgCYowa5kA0I2KAFcAtiRQAXSkOz9sADwxgJ+NPTbYuQ3BMnTZA+Y2yU4IwRO4A6SFBIrGVDGM7c+h46fNRLuKxJIGWh8MeT0ZfhYlCStpHzNsFBAMIQkIEQwJODAQfiEyfBE4eWw2fDgofDBMsAALfAA3KjgsXGxxZC4eAw0G-GhcWn9aY3wWZldu-g1mbGqJUoBaCRHEzrcDEgBrbAk62kXhXFxJ923d-cPRHEpTgyEoMDaqZdW7vKgoOfaSKgOKpqmDA+d4gB5fMA-P6LCCMLLQbiLOoYCqgh6-GDYRYIXYLSgkRZkCR4jpddwPfJLZjpOBkO4AX34kA0SRWxgABAAxYjsgC87OAAB0oOzReythU2Mh2YKQNyILLeMKxeymrgZNLhCIbsL6QBuYVs7DsgBCVD5AuVYolUClMpAZsoiqtorVGvZWpuSqg9OFMAeyjg0HZdTmW3lAAp5NKAPJoABWcwkAEppWZGLg4O12fJ2bSuTyhSKxSwJEJKCKAOQ2tiVvMi3MAMkbOasNb5vP5svlsoNPuFfoD8JFGQqUel8vZAB9TVReCHoHa0MRnlBUwWIJbi6K4DB2RHbGxk1uVSrd-uAIShsDh4hR5PHoun5-siS1SgQADuHuw34AotQECUBGsqysmfYvuyvrbqepblg2EFitBKpwRWOZ9vSuQgA0JgkEGUBJBk9gmCA9JAA
 * https://www.typescriptlang.org/play/?#code/C4TwDgpgBAYg9nKBeKBvAUFLUDWBLAOwBMAuKAInjnIBpNsA3AQwBsBXCMgtgWwCMIAJ3QBfANzpQkKACEmg5GnpZ8xMuTmDayqM3aco3fkLoj0AMzYEAxsDxwCUawAsI1nFQAUADzJw+AFZuwACUZEwAzhFCwBFQ3lB4cVRK2InmUJ4AhJ4A5KpEuYmOCQBkpfEAdAXISCiUCOQhIalp2MDOgnAA7oYQvQCigl2CnuRWEN6QthBETTpmZhZWtvaOPEyEPmQpAD6y8jRODqRQfAgsEEwEYbAIrVh4GZ7WJy0Ybdgubh4IPiEST5YQQQYBsQQlQHYMxpEFgiHxCQiIA
 *
 * Found differences in evaluator results
 * Non-forget (expected):
 *   (kind: ok)
 *   [2]
 *   [3]
 * Forget:
 *   (kind: ok)
 *   [2]
 *   [2,3]
 */
function useFoo({cond, value}: {cond: boolean; value: number}) {
  const x = {value: cond ? CONST_NUMBER0 : []};
  mutate(x);

  const xValue = x.value;
  let result;
  if (typeof xValue === 'number') {
    result = xValue + 1; //               (1) here we infer xValue is a primitive
  } else {
    result = arrayPush(xValue, value); // (2) and propagate it to all other xValue references
  }

  return result;
}
export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{cond: true}],
  sequentialRenders: [
    {cond: false, value: 2},
    {cond: false, value: 3},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { arrayPush, CONST_NUMBER0, mutate } from "shared-runtime";

/**
 * Repro for bug in our type inference system. We currently propagate inferred
 * types through control flow / potential type guards. Note that this is
 * inconsistent with both Flow and Typescript.
 * https://flow.org/try/#1N4Igxg9gdgZglgcxALlAIwIZoKYBsD6uEEAztvhgE6UYCe+JADpdhgCYowa5kA0I2KAFcAtiRQAXSkOz9sADwxgJ+NPTbYuQ3BMnTZA+Y2yU4IwRO4A6SFBIrGVDGM7c+h46fNRLuKxJIGWh8MeT0ZfhYlCStpHzNsFBAMIQkIEQwJODAQfiEyfBE4eWw2fDgofDBMsAALfAA3KjgsXGxxZC4eAw0G-GhcWn9aY3wWZldu-g1mbGqJUoBaCRHEzrcDEgBrbAk62kXhXFxJ923d-cPRHEpTgyEoMDaqZdW7vKgoOfaSKgOKpqmDA+d4gB5fMA-P6LCCMLLQbiLOoYCqgh6-GDYRYIXYLSgkRZkCR4jpddwPfJLZjpOBkO4AX34kA0SRWxgABAAxYjsgC87OAAB0oOzReythU2Mh2YKQNyILLeMKxeymrgZNLhCIbsL6QBuYVs7DsgBCVD5AuVYolUClMpAZsoiqtorVGvZWpuSqg9OFMAeyjg0HZdTmW3lAAp5NKAPJoABWcwkAEppWZGLg4O12fJ2bSuTyhSKxSwJEJKCKAOQ2tiVvMi3MAMkbOasNb5vP5svlsoNPuFfoD8JFGQqUel8vZAB9TVReCHoHa0MRnlBUwWIJbi6K4DB2RHbGxk1uVSrd-uAIShsDh4hR5PHoun5-siS1SgQADuHuw34AotQECUBGsqysmfYvuyvrbqepblg2EFitBKpwRWOZ9vSuQgA0JgkEGUBJBk9gmCA9JAA
 * https://www.typescriptlang.org/play/?#code/C4TwDgpgBAYg9nKBeKBvAUFLUDWBLAOwBMAuKAInjnIBpNsA3AQwBsBXCMgtgWwCMIAJ3QBfANzpQkKACEmg5GnpZ8xMuTmDayqM3aco3fkLoj0AMzYEAxsDxwCUawAsI1nFQAUADzJw+AFZuwACUZEwAzhFCwBFQ3lB4cVRK2InmUJ4AhJ4A5KpEuYmOCQBkpfEAdAXISCiUCOQhIalp2MDOgnAA7oYQvQCigl2CnuRWEN6QthBETTpmZhZWtvaOPEyEPmQpAD6y8jRODqRQfAgsEEwEYbAIrVh4GZ7WJy0Ybdgubh4IPiEST5YQQQYBsQQlQHYMxpEFgiHxCQiIA
 *
 * Found differences in evaluator results
 * Non-forget (expected):
 *   (kind: ok)
 *   [2]
 *   [3]
 * Forget:
 *   (kind: ok)
 *   [2]
 *   [2,3]
 */
function useFoo(t0) {
  const $ = _c(5);
  const { cond, value } = t0;
  let x;
  if ($[0] !== cond) {
    x = { value: cond ? CONST_NUMBER0 : [] };
    mutate(x);
    $[0] = cond;
    $[1] = x;
  } else {
    x = $[1];
  }

  const xValue = x.value;
  let result;
  if (typeof xValue === "number") {
    result = xValue + 1;
  } else {
    let t1;
    if ($[2] !== value || $[3] !== xValue) {
      t1 = arrayPush(xValue, value);
      $[2] = value;
      $[3] = xValue;
      $[4] = t1;
    } else {
      t1 = $[4];
    }
    result = t1;
  }

  return result;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ cond: true }],
  sequentialRenders: [
    { cond: false, value: 2 },
    { cond: false, value: 3 },
  ],
};

```
      