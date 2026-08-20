// Expected to fail

// Invalid because it's dangerous and might not warn otherwise.
// This *must* be invalid.
function useHookInLoops() {
  while (a) {
    useHook1();
    if (b) return;
    useHook2();
  }
  while (c) {
    useHook3();
    if (d) return;
    useHook4();
  }
}
