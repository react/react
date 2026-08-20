import {useIdentity} from 'shared-runtime';

function Component() {
  const items = makeArray(0, 1, 2, null, 4, false, 6);
  return useIdentity(...items.values());
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [{}, {}],
};
