import {makeArray} from 'shared-runtime';

/**
 * This fixture tests what happens when a reactive has no declarations (other than an early return),
 * no reassignments, and no dependencies. In this case the only thing we can use to decide if we
 * should take the if or else branch is the early return declaration. But if that uses the same
 * sentinel as the memo cache sentinel, then if the previous execution did not early return it will
 * look like we didn't execute the memo block yet, and we'll needlessly re-execute instead of skipping
 * to the else branch.
 *
 * We have to use a distinct sentinel for the early return value.
 *
 * Here the fixture will always take the "else" branch and never early return. Logging (not included)
 * confirms that the scope for `x` only executes once, on the first render of the component.
 */
let ENABLE_FEATURE = false;

function Component(props) {
  let x = [];
  if (ENABLE_FEATURE) {
    x.push(42);
    return x;
  } else {
    console.log('fallthrough');
  }
  return makeArray(props.a);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [
    {a: 42},
    {a: 42},
    {a: 3.14},
    {a: 3.14},
    {a: 42},
    {a: 3.14},
    {a: 42},
    {a: 3.14},
  ],
};
