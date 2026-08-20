// @enableTransitivelyFreezeFunctionExpressions:false
import {
  Stringify,
  mutate,
  identity,
  setPropertyByKey,
  shallowCopy,
} from 'shared-runtime';
/**
 * Function expression version of `aliased-nested-scope-truncated-dep`.
 *
 * In this fixture, the output would be invalid if propagateScopeDeps did not
 * avoid adding MemberExpression dependencies which would other evaluate during
 * the mutable ranges of their base objects.
 * This is different from `aliased-nested-scope-truncated-dep` which *does*
 * produce correct output regardless of MemberExpression dependency truncation.
 *
 * Note while other expressions evaluate inline, function expressions *always*
 * represent deferred evaluation. This means that
 * (1) it's always safe to reorder function expression creation until its
 *     earliest potential invocation
 * (2) it's invalid to eagerly evaluate function expression dependencies during
 *     their respective mutable ranges.
 */

function Component({prop}) {
  let obj = shallowCopy(prop);

  const aliasedObj = identity(obj);

  // When `obj` is mutable (either directly or through aliases), taking a
  // dependency on `obj.id` is invalid as it may change before getId() is invoked
  const getId = () => obj.id;

  mutate(aliasedObj);
  setPropertyByKey(aliasedObj, 'id', prop.id + 1);

  // Calling getId() should return prop.id + 1, not the prev
  return <Stringify getId={getId} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{prop: {id: 1}}],
  sequentialRenders: [{prop: {id: 1}}, {prop: {id: 1}}, {prop: {id: 2}}],
};
