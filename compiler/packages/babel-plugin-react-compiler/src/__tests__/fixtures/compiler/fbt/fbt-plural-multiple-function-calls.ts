// @enablePreserveExistingMemoizationGuarantees:false
import fbt from 'fbt';

// Each plural count must select its own singular or plural form.

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
