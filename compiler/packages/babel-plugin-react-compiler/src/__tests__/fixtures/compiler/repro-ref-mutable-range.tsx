import {Stringify, identity, mutate, CONST_TRUE} from 'shared-runtime';

function Foo(props, ref) {
  const value = {};
  if (CONST_TRUE) {
    mutate(value);
    return <Stringify ref={ref} />;
  }
  mutate(value);
  if (CONST_TRUE) {
    return <Stringify ref={identity(ref)} />;
  }
  return value;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}, {current: 'fake-ref-object'}],
};
