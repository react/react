// Expected to fail

// Invalid because it's dangerous and might not warn otherwise.
// This *must* be invalid.
function ComponentWithHookInsideLoop() {
  while (cond) {
    useHookInsideLoop();
  }
}
