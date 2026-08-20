// @validatePreserveExistingMemoizationGuarantees

import {Builder} from 'shared-runtime';
function useTest({isNull, data}: {isNull: boolean; data: string}) {
  const result = Builder.makeBuilder(isNull, 'hello world')
    ?.push('1', 2)
    ?.push(3, {
      a: 4,
      b: 5,
      c: data,
    })
    ?.push(6, data)
    ?.push(7, '8')
    ?.push('8', Builder.makeBuilder(!isNull)?.push(9).vals)?.vals;
  return result;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useTest,
  params: [{isNull: false, data: 'param'}],
};
