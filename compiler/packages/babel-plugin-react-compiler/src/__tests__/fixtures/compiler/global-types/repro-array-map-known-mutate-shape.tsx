import {Stringify, useIdentity} from 'shared-runtime';

/**
 * Also see repro-array-map-known-nonmutate-Boolean, which calls a global
 * function that does *not* mutate its operands.
 */
function Component({value}) {
  const arr = [
    new Set([['foo', 2]]).values(),
    new Set([['bar', 4]]).values(),
    [['baz', value]],
  ];
  useIdentity(null);
  const derived = arr.map(Object.fromEntries);
  return (
    <Stringify>
      {derived.at(0)}
      {derived.at(-1)}
    </Stringify>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 5}],
  sequentialRenders: [{value: 5}, {value: 6}, {value: 6}],
};
