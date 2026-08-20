// @validatePreserveExistingMemoizationGuarantees
import {useCallback, useTransition} from 'react';

function useFoo() {
  const [, /* state value intentionally not captured */ setState] = useState();

  return useCallback(() => {
    setState(x => x + 1);
  }, []);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};
