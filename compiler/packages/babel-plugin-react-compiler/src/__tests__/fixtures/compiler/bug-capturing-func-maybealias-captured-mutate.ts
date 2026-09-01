// @enableNewMutationAliasingModel:false
import {makeArray, mutate} from 'shared-runtime';

/**
 * Bug repro:
 * Found differences in evaluator results
 *   Non-forget (expected):
 *   (kind: ok)
 *   {"bar":4,"x":{"foo":3,"wat0":"joe"}}
 *   {"bar":5,"x":{"foo":3,"wat0":"joe"}}
 *   Forget:
 *   (kind: ok)
 *   {"bar":4,"x":{"foo":3,"wat0":"joe"}}
 *   {"bar":5,"x":{"foo":3,"wat0":"joe","wat1":"joe"}}
 *
 * Fork of `capturing-func-alias-captured-mutate`, but instead of directly
 * aliasing `y` via `[y]`, we make an opaque call.
 *
 * Note that the bug here is that we don't infer that `a = makeArray(y)`
 * potentially captures a context variable into a local variable. As a result,
 * we don't understand that `a[0].x = b` captures `x` into `y` -- instead, we're
 * currently inferring that this lambda captures `y` (for a potential later
 * mutation) and simply reads `x`.
 *
 * Concretely `InferReferenceEffects.hasContextRefOperand` is incorrectly not
 * used when we analyze CallExpressions.
 */
function Component({foo, bar}: {foo: number; bar: number}) {
  let x = {foo};
  let y: {bar: number; x?: {foo: number}} = {bar};
  const f0 = function () {
    let a = makeArray(y); // a = [y]
    let b = x;
    // this writes y.x = x
    a[0].x = b;
  };
  f0();
  mutate(y.x);
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{foo: 3, bar: 4}],
  sequentialRenders: [
    {foo: 3, bar: 4},
    {foo: 3, bar: 5},
  ],
};
