import {Stringify} from 'shared-runtime';

/**
 * Regression test for https://github.com/facebook/react/issues/33689
 *
 * `compute` is invoked before its lexical position, so the compiler
 * hoists it. The compiler also rewrites `helper` into a `const` binding
 * initialized at its lexical position (between the call and `compute`'s
 * declaration). Without transitive hoisting, `compute`'s call to
 * `helper` hits the TDZ at runtime — Babel's `function compute(...)`
 * hoists but the `const helper = ...` it relies on does not.
 *
 * With transitive hoisting, `helper` is hoisted alongside `compute` so
 * both are available when the early call runs.
 */
function Component({data}) {
  const result = compute(data);

  function helper(x) {
    return x > 0;
  }

  function compute(arr) {
    return arr.filter(helper);
  }

  return <Stringify result={result} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{data: [-1, 0, 1, 2, -3]}],
};
