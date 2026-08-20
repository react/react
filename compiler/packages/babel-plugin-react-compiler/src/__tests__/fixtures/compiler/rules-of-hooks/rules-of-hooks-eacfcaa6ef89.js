// Valid because hooks can be used in anonymous function arguments to
// memo.
const MemoizedFunction = memo(function (props) {
  useHook();
  return <button {...props} />;
});
