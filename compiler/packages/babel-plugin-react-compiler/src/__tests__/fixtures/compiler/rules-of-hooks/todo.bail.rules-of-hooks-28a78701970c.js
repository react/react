// @skip
// Unsupported input

// Valid because hooks can be used in anonymous function arguments to
// React.memo.
const MemoizedFunction = React.memo(props => {
  useHook();
  return <button {...props} />;
});
