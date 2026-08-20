import {useIdentity, ValidateMemoization} from 'shared-runtime';

/**
 * Fixture for granular iterator semantics:
 * 1. ConditionallyMutate the iterator itself, depending on whether the iterator
 *    is a mutable iterator.
 * 2. Capture effect on elements within the iterator.
 */
function Validate({x, input}) {
  'use no memo';
  return (
    <>
      <ValidateMemoization inputs={[]} output={x[0]} onlyCheckCompiled={true} />
      <ValidateMemoization
        inputs={[input]}
        output={x[1]}
        onlyCheckCompiled={true}
      />
    </>
  );
}
function useFoo(input) {
  'use memo';
  /**
   * We should be able to memoize {} separately from `x`.
   */
  const x = Array.from([{}]);
  useIdentity();
  x.push([input]);
  return <Validate x={x} input={input} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [1],
};
