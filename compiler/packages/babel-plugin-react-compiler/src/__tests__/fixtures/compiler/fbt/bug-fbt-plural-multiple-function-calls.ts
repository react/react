// @enablePreserveExistingMemoizationGuarantees:false
import fbt from 'fbt';

/**
 * Similar to error.todo-multiple-fbt-plural
 *
 * Evaluator error:
 *   Found differences in evaluator results
 *   Non-forget (expected):
 *   (kind: ok) <div>1 apple and 2 bananas</div>
 *   Forget:
 *   (kind: ok) <div>1 apples and 2 bananas</div>
 */

function useFoo({apples, bananas}) {
  return fbt(
    `${fbt.param('number of apples', apples)} ` +
      fbt.plural('apple', apples) +
      ` and ${fbt.param('number of bananas', bananas)} ` +
      fbt.plural('banana', bananas),
    'TestDescription',
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{apples: 1, bananas: 2}],
};
