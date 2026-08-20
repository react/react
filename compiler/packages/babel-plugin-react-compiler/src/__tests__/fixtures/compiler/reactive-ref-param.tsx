import {useRef, forwardRef} from 'react';
import {Stringify} from 'shared-runtime';

/**
 * Fixture showing that Ref types may be reactive.
 * We should always take a dependency on ref values (the outer box) as
 * they may be reactive. Pruning should be done in
 * `pruneNonReactiveDependencies`
 */

function Parent({cond}) {
  const ref1 = useRef(1);
  const ref2 = useRef(2);
  const ref = cond ? ref1 : ref2;
  return <Child ref={ref} />;
}

function ChildImpl(_props, ref) {
  const cb = () => ref.current;
  return <Stringify cb={cb} shouldInvokeFns={true} />;
}

const Child = forwardRef(ChildImpl);

export const FIXTURE_ENTRYPOINT = {
  fn: Parent,
  params: [{cond: true}],
  sequentialRenders: [{cond: true}, {cond: false}],
};
