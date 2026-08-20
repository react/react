// Expected to fail

// Invalid because it's dangerous and might not warn otherwise.
// This *must* be invalid.
function normalFunctionWithConditionalHook() {
  if (cond) {
    useHookInsideNormalFunction();
  }
}
