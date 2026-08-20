// Expected to fail

// Invalid because it's dangerous and might not warn otherwise.
// This *must* be invalid.
function useHook() {
  if (b) {
    console.log('true');
  } else {
    console.log('false');
  }
  if (a) return;
  useState();
}
