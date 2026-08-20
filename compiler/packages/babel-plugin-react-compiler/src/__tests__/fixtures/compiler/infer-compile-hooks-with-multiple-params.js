// @compilationMode:"infer"
import {useNoAlias} from 'shared-runtime';

// This should be compiled by Forget
function useFoo(value1, value2) {
  return {
    value: useNoAlias(value1 + value2),
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [1, 2],
};
