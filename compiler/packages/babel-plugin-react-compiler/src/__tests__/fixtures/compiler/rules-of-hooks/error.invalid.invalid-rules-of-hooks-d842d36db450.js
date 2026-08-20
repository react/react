// Invalid because it's dangerous and might not warn otherwise.
// This *must* be invalid.
function createComponent() {
  return function ComponentWithConditionalHook() {
    if (cond) {
      useConditionalHook();
    }
  };
}
