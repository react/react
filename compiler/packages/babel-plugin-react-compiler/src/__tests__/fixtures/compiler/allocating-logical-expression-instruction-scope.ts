/**
 * This is a weird case as data has type `BuiltInMixedReadonly`.
 * The only scoped value we currently infer in this program is the
 * PropertyLoad `data?.toString`.
 */
import {useFragment} from 'shared-runtime';

function Foo() {
  const data = useFragment();
  return [data?.toString() || ''];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
};
