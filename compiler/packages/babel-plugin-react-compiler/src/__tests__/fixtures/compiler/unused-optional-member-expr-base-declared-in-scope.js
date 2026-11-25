import {identity, makeArray} from 'shared-runtime';

// Repro for https://github.com/facebook/react/issues/37540: the unused
// `x?.icon` is preserved as a statement after the scope that declares `x`,
// so `x` must be an output of that scope.
function Component({a}) {
  const x = a ? identity({slug: a, icon: 'icon'}) : null;
  const y = x ? makeArray(x.slug) : [];
  const unused = x?.icon;
  return <div>{y.length}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 'a'}],
  sequentialRenders: [{a: 'a'}, {a: null}, {a: 'b'}],
};
