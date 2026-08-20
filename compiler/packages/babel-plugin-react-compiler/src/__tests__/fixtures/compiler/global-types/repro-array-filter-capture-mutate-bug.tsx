import {mutateAndReturn, Stringify, useIdentity} from 'shared-runtime';

/**
 * Repro for bug with `mutableOnlyIfOperandsAreMutable` flag
 * Found differences in evaluator results
  * Non-forget (expected):
  * (kind: ok)
  * <div>{"children":[{"value":"foo","wat0":"joe"},{"value":5,"wat0":"joe"}]}</div>
  * <div>{"children":[{"value":"foo","wat0":"joe"},{"value":6,"wat0":"joe"}]}</div>
  * <div>{"children":[{"value":"foo","wat0":"joe"},{"value":6,"wat0":"joe"}]}</div>
  * Forget:
  * (kind: ok)
  * <div>{"children":[{"value":"foo","wat0":"joe"},{"value":5,"wat0":"joe"}]}</div>
  * <div>{"children":[{"value":"foo","wat0":"joe","wat1":"joe"},{"value":6,"wat0":"joe"}]}</div>
  * <div>{"children":[{"value":"foo","wat0":"joe","wat1":"joe"},{"value":6,"wat0":"joe"}]}</div>

 */
function Component({value}) {
  const arr = [{value: 'foo'}, {value: 'bar'}, {value}];
  useIdentity(null);
  const derived = arr.filter(mutateAndReturn);
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
