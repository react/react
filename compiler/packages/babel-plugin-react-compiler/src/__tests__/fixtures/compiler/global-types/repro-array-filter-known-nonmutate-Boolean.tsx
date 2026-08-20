import {Stringify, useIdentity} from 'shared-runtime';

/**
 * Also see repro-array-map-known-mutate-shape, which calls a global function
 * that mutates its operands.
 */
function Component({value}) {
  const arr = [{value: 'foo'}, {value: 'bar'}, {value}];
  useIdentity(null);
  const derived = arr.filter(Boolean);
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
