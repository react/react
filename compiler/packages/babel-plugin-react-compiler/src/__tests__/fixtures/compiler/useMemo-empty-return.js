// @validateNoVoidUseMemo
function Component() {
  const value = useMemo(() => {
    return;
  }, []);
  return <div>{value}</div>;
}
