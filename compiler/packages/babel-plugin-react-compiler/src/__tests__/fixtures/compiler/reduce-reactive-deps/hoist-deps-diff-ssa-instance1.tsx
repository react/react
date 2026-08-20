import {identity, shallowCopy, Stringify, useIdentity} from 'shared-runtime';

type HasA = {kind: 'hasA'; a: {value: number}};
type HasC = {kind: 'hasC'; c: {value: number}};
function Foo({cond}: {cond: boolean}) {
  let x: HasA | HasC = shallowCopy({kind: 'hasA', a: {value: 2}});
  /**
   * This read of x.a.value is outside of x's identifier mutable
   * range + scope range. We mark this ssa instance (x_@0) as having
   * a non-null object property `x.a`.
   */
  Math.max(x.a.value, 2);
  if (cond) {
    x = shallowCopy({kind: 'hasC', c: {value: 3}});
  }

  /**
   * Since this x (x_@2 = phi(x_@0, x_@1)) is a different ssa instance,
   * we cannot safely hoist a read of `x.a.value`
   */
  return <Stringify val={!cond && [(x as HasA).a.value + 2]} />;
}
export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{cond: false}],
  sequentialRenders: [{cond: false}, {cond: true}],
};
