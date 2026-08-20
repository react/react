import {mutateAndReturn, Stringify, useIdentity} from 'shared-runtime';

/**
 * Copy of repro-array-map-capture-mutate-bug, showing that the same issue applies to any
 * function call which captures its callee when applying an operand.
 */
function Component({value}) {
  const arr = [{value: 'foo'}, {value: 'bar'}, {value}];
  useIdentity(null);
  const derived = arr.map(mutateAndReturn);
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
