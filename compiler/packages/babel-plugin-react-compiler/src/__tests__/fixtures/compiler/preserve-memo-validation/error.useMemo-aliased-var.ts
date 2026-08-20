// @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false

// This is technically a false positive, but source is already breaking
// `exhaustive-deps` lint rule (and can be considered invalid).
function useHook(x) {
  const aliasedX = x;
  const aliasedProp = x.y.z;

  return useMemo(() => [x, x.y.z], [aliasedX, aliasedProp]);
}
