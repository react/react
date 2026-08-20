import {ValidateMemoization} from 'shared-runtime';

// Achieving Forget's level of memoization precision in this example isn't possible with useMemo
// without significantly altering the code, so disable the non-Forget evaluation of this fixture.
// @disableNonForgetInSprout
function Component({a, b, c}) {
  const x = [];
  let y;
  if (a) {
    y = [b];
  }
  x.push(c);

  // this scope should not merge with the above scope because y does not invalidate
  // on changes to `c`
  const z = [y];

  // return [x, z];
  return (
    <>
      <ValidateMemoization inputs={[a, b, c]} output={x} />
      <ValidateMemoization inputs={[a, b]} output={z} />
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: false, b: null, c: 0}],
  sequentialRenders: [
    {a: false, b: null, c: 0},
    {a: false, b: null, c: 1},
    {a: true, b: 0, c: 1},
    {a: true, b: 1, c: 1},
  ],
};
