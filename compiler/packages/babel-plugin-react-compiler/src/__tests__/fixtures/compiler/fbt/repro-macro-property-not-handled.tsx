import fbt from 'fbt';
import {useIdentity} from 'shared-runtime';

/**
 * MemoizeFbtAndMacroOperandsInSameScope should also track PropertyLoads (e.g. fbt.plural).
 * This doesn't seem to be an issue for fbt, but affects other internal macros invoked as
 * `importSpecifier.funcName` (see https://fburl.com/code/72icxwmn)
 */
function useFoo({items}: {items: Array<number>}) {
  return fbt(
    'There ' +
      fbt.plural('is', useIdentity([...items]).length, {many: 'are'}) +
      ' ' +
      fbt.param('number of items', items.length) +
      ' items',
    'Error content when there are unsupported locales.',
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{items: [2, 3]}],
};
