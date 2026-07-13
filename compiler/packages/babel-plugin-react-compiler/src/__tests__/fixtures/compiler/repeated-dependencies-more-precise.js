// @flow
import {Stringify} from 'shared-runtime';

/**
 * Example fixture demonstrating a case where we could hoist dependencies
 * and reuse them across scopes. Here we extract a temporary for `item.value`
 * and reference it both in the scope for `a`. Then the scope for `c` could
 * use `<item-value-temp>.inner` as its dependency, avoiding reloading
 * `item.value`.
 */
function Test({item, index}: {item: {value: {inner: any}}, index: number}) {
  // These scopes have the same dependency, `item.value`, and could
  // share a hoisted expression to evaluate it
  const a = [];
  if (index) {
    a.push({value: item.value, index});
  }
  const b = [item.value];

  // This dependency is more precise (nested property), the outer
  // `item.value` portion could use a hoisted dep for `item.value
  const c = [item.value.inner];
  return <Stringify value={[a, b, c]} />;
}
