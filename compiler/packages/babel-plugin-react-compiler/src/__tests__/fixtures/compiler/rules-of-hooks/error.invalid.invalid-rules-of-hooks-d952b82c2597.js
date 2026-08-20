// Invalid because it's a common misunderstanding.
// We *could* make it valid but the runtime error could be confusing.
function ComponentWithHookInsideCallback() {
  useEffect(() => {
    useHookInsideCallback();
  });
}
