// Expected to fail

// Invalid because it's dangerous and might not warn otherwise.
// This *must* be invalid.
function useHookInLoops() {
  while (a) {
    useHook1();
    if (b) continue;
    useHook2();
  }
}
