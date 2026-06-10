import {Stringify} from 'shared-runtime';

/**
 * Repro for react/react#34232: Object.fromEntries() captures its argument
 * rather than mutating it. When the argument was modeled as
 * ConditionallyMutate, a local array passed to Object.fromEntries was
 * entangled into a single reactive scope with the result and their
 * consumers; with Capture, each value gets its own scope.
 */
function Component({a}) {
  const pairs = [['key', a]];
  const obj = Object.fromEntries(pairs);
  return <Stringify obj={obj} pairs={pairs} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 42}],
};
