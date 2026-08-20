// Expected to fail

// Invalid because it's dangerous and might not warn otherwise.
// This *must* be invalid.
function useLabeledBlock() {
  label: {
    if (a) break label;
    useHook();
  }
}
