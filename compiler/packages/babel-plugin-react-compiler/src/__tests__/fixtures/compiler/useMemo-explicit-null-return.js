// @validateNoVoidUseMemo
function Component() {
  const value = useMemo(() => {
    return null;
  }, []);
  return <div>{value}</div>;
}
