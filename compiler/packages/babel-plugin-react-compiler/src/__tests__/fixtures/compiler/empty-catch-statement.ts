import {getNumber} from 'shared-runtime';

function useFoo() {
  try {
    return getNumber();
  } catch {}
}
export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};
