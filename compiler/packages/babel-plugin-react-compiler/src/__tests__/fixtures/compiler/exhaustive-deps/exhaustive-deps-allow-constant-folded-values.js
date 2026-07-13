// @validateExhaustiveMemoizationDependencies

function Component() {
  const x = 0;
  const y = useMemo(() => {
    return [x];
    // x gets constant-folded but shouldn't count as extraneous,
    // it was referenced in the memo block
  }, [x]);
  return y;
}
