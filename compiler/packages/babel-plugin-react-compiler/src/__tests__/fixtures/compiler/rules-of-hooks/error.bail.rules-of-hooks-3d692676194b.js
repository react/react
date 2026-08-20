// @skip
// Unsupported input

// Invalid because it's a common misunderstanding.
// We *could* make it valid but the runtime error could be confusing.
const ComponentWithHookInsideCallback = React.forwardRef((props, ref) => {
  useEffect(() => {
    useHookInsideCallback();
  });
  return <button {...props} ref={ref} />;
});
