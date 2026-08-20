// Valid because hooks can call hooks.
function useHook() {
  useHook1();
  useHook2();
}
