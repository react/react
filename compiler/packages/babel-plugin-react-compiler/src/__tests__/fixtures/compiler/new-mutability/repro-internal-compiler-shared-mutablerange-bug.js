//@flow @validatePreserveExistingMemoizationGuarantees @enableNewMutationAliasingModel
component Component(
  onAsyncSubmit?: (() => void) => void,
  onClose: (isConfirmed: boolean) => void
) {
  // When running inferReactiveScopeVariables,
  // onAsyncSubmit and onClose update to share
  // a mutableRange instance.
  const onSubmit = useCallback(() => {
    if (onAsyncSubmit) {
      onAsyncSubmit(() => {
        onClose(true);
      });
      return;
    }
  }, [onAsyncSubmit, onClose]);
  // When running inferReactiveScopeVariables here,
  // first the existing range gets updated (affecting
  // onAsyncSubmit) and then onClose gets assigned a
  // different mutable range instance, which is the
  // one reset after AnalyzeFunctions.
  // The fix is to fully reset mutable ranges *instances*
  // after AnalyzeFunctions visit a function expression
  return <Dialog onSubmit={onSubmit} onClose={() => onClose(false)} />;
}
