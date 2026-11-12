// @loggerTestOnly @outputMode:"lint" @enableLintFastPath
/**
 * Without the fast path, a later pass throws an invariant for this function
 * (see rules-of-hooks/error.invalid-hook-for.js), which replaces the Rules of
 * Hooks errors recorded earlier. With the fast path, those errors are reported.
 */
function Component(props) {
  let i = 0;
  for (let x = 0; useHook(x) < 10; useHook(i), x++) {
    i += useHook(x);
  }
  return i;
}
