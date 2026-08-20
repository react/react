// @skip
// Unsupported input

// Invalid because it's a common misunderstanding.
// We *could* make it valid but the runtime error could be confusing.
const ComponentWithHookInsideCallback = React.memo(props => {
  useEffect(() => {
    useHookInsideCallback();
  });
  return <button {...props} />;
});
