// @enableNewMutationAliasingModel
import {identity, mutate} from 'shared-runtime';

/**
 * Fixed in the new inference model.
 *
 * Bug: copy of error.todo-object-expression-computed-key-modified-during-after-construction-sequence-expr
 * with the mutation hoisted to a named variable instead of being directly
 * inlined into the Object key.
 *
 * Found differences in evaluator results
 *   Non-forget (expected):
 *   (kind: ok) [{"[object Object]":[42]},{"wat0":"joe","wat1":"joe"}]
 *   [{"[object Object]":[42]},{"wat0":"joe","wat1":"joe"}]
 *   Forget:
 *   (kind: ok) [{"[object Object]":[42]},{"wat0":"joe","wat1":"joe"}]
 *   [{"[object Object]":[42]},{"wat0":"joe","wat1":"joe","wat2":"joe"}]
 */
function Component(props) {
  const key = {};
  const tmp = (mutate(key), key);
  const context = {
    // Here, `tmp` is frozen (as it's inferred to be a primitive/string)
    [tmp]: identity([props.value]),
  };
  mutate(key);
  return [context, key];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
  sequentialRenders: [{value: 42}, {value: 42}],
};
