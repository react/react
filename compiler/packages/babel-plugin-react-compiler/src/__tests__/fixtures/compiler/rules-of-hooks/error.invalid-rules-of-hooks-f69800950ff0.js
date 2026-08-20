// Expected to fail

// Invalid because it's dangerous and might not warn otherwise.
// This *must* be invalid.
function useHook({bar}) {
  let foo1 = bar && useState();
  let foo2 = bar || useState();
  let foo3 = bar ?? useState();
}
