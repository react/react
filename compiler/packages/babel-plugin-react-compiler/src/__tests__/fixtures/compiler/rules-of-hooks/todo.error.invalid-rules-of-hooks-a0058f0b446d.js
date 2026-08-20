// @skip
// Passed but should have failed

// Invalid because it's dangerous and might not warn otherwise.
// This *must* be invalid.
function ComponentWithConditionalHook() {
  if (cond) {
    Namespace.useConditionalHook();
  }
}
