// Valid because hooks can be used in anonymous function arguments to
// forwardRef.
const FancyButton = forwardRef(function (props, ref) {
  useHook();
  return <button {...props} ref={ref} />;
});
