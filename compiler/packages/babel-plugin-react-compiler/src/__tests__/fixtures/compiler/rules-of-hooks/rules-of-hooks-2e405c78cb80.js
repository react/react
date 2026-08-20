// Valid because hooks can call hooks.
function useHook() {
  useState() && a;
}
