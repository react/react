// @expectNothingCompiled @skip
// Passed but should have failed

// Invalid because it's dangerous.
// Normally, this would crash, but not if you use inline requires.
// This *must* be invalid.
// It's expected to have some false positives, but arguably
// they are confusing anyway due to the use*() convention
// already being associated with Hooks.
useState();
if (foo) {
  const foo = React.useCallback(() => {});
}
useCustomHook();
