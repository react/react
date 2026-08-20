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
