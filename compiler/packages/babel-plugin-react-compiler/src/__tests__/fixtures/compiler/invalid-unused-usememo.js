// @validateNoVoidUseMemo @loggerTestOnly
function Component() {
  useMemo(() => {
    return [];
  }, []);
  return <div />;
}
