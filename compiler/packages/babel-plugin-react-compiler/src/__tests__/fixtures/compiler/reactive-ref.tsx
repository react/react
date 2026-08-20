import {useRef} from 'react';
import {Stringify} from 'shared-runtime';

/**
 * Fixture showing that Ref types may be reactive.
 * We should always take a dependency on ref values (the outer box) as
 * they may be reactive. Pruning should be done in
 * `pruneNonReactiveDependencies`
 */
function Component({cond}) {
  const ref1 = useRef(1);
  const ref2 = useRef(2);
  const ref = cond ? ref1 : ref2;
  const cb = () => ref.current;
  return <Stringify cb={cb} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: true}],
  sequentialRenders: [{cond: true}, {cond: false}],
};
