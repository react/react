// @loggerTestOnly @validateExhaustiveMemoizationDependencies:false
function component(a) {
  let x = useMemo(() => {
    mutate(a);
  }, []);
  return x;
}
