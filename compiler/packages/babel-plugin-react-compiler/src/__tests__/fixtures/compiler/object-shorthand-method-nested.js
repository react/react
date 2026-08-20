import {useState} from 'react';
import {createHookWrapper} from 'shared-runtime';

function useHook({value}) {
  const [state] = useState(false);

  return {
    getX() {
      return {
        a: [],
        getY() {
          return value;
        },
        state,
      };
    },
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useHook),
  params: [{value: 0}],
};
