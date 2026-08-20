// @validatePreserveExistingMemoizationGuarantees
import {useCallback, useTransition} from 'react';

function useFoo() {
  const [t, start] = useTransition();

  return useCallback(() => {
    start();
  }, []);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};
