import {createHookWrapper} from 'shared-runtime';
import {useState} from 'react';
function useFoo() {
  const [state, _setState] = useState(false);
  return {
    func() {
      return state;
    },
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useFoo),
  params: [{}],
};
