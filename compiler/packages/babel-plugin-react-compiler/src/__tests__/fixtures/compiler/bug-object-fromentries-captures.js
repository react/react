import {Stringify} from 'shared-runtime';

/**
 * Repro for react/react#34232: Object.fromEntries() captures its argument
 * rather than mutating it. Modeling the argument as ConditionallyMutate
 * extends the argument's mutable range through the call, entangling the
 * argument, the result, and their consumers into a single reactive scope.
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
