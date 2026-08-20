// Invalid because it's dangerous and might not warn otherwise.
// This *must* be invalid.
function createHook() {
  return function useHookWithConditionalHook() {
    if (cond) {
      useConditionalHook();
    }
  };
}
