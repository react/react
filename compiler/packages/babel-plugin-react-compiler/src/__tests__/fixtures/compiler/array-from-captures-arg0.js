import {useIdentity, Stringify} from 'shared-runtime';

/**
 * TODO: Note that this `Array.from` is inferred to be mutating its first
 * argument. This is because React Compiler's typing system does not yet support
 * annotating a function with a set of argument match cases + distinct
 * definitions (polymorphism)
 *
 * In this case, we should be able to infer that the `Array.from` call is
 * not mutating its 0th argument.
 * The 0th argument should be typed as having `effect:Mutate` only when
 * (1) it might be a mutable iterable or
 * (2) the 1st argument might mutate its callee
 */
function Component({value}) {
  const arr = [{value: 'foo'}, {value: 'bar'}, {value}];
  useIdentity();
  const derived = Array.from(arr);
  return <Stringify>{derived.at(-1)}</Stringify>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 5}],
  sequentialRenders: [{value: 5}, {value: 6}, {value: 6}],
};
