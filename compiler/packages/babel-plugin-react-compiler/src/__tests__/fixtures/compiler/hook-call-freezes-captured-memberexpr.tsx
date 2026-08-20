import {useIdentity, Stringify, identity} from 'shared-runtime';

function Foo({val1}) {
  // `x={inner: val1}` should be able to be memoized
  const x = {inner: val1};

  // Any references to `x` after this hook call should be read-only
  const cb = useIdentity(() => x.inner);

  // With enableTransitivelyFreezeFunctionExpressions, it's invalid
  // to write to `x` after it's been frozen.
  // TODO: runtime validation for DX
  const copy = identity(x);
  return <Stringify copy={copy} cb={cb} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{val1: 1}],
  sequentialRenders: [{val1: 1}, {val1: 1}],
};
