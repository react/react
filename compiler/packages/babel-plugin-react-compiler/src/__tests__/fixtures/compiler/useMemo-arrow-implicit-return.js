// @validateNoVoidUseMemo
function Component() {
  const value = useMemo(() => computeValue(), []);
  return <div>{value}</div>;
}
