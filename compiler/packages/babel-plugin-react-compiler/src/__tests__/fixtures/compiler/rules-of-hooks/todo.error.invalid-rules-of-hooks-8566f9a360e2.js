// @skip
// Passed but should have failed

// Invalid because it's dangerous and might not warn otherwise.
// This *must* be invalid.
const MemoizedButton = memo(function (props) {
  if (props.fancy) {
    useCustomHook();
  }
  return <button>{props.children}</button>;
});
