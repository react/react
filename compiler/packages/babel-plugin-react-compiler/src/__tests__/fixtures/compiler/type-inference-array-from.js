import {useIdentity, ValidateMemoization} from 'shared-runtime';

/**
 * Fixture to assert that we can infer the type and effects of an array created
 * with `Array.from`.
 */
function Validate({x, val1, val2}) {
  'use no memo';
  return (
    <>
      <ValidateMemoization
        inputs={[val1]}
        output={x[0]}
        onlyCheckCompiled={true}
      />
      <ValidateMemoization
        inputs={[val2]}
        output={x[1]}
        onlyCheckCompiled={true}
      />
    </>
  );
}
function useFoo({val1, val2}) {
  'use memo';
  const x = Array.from([]);
  useIdentity();
  x.push([val1]);
  x.push([val2]);
  return <Validate x={x} val1={val1} val2={val2} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{val1: 1, val2: 2}],
  params: [
    {val1: 1, val2: 2},
    {val1: 1, val2: 2},
    {val1: 1, val2: 3},
    {val1: 4, val2: 2},
  ],
};
