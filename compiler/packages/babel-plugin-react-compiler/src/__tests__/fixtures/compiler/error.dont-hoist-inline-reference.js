import {identity} from 'shared-runtime';
function useInvalid() {
  const x = identity(x);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useInvalid,
  params: [],
};
