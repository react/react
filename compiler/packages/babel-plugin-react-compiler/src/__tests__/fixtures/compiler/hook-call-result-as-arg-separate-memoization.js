// Repro for https://github.com/facebook/react/issues/36848
// The result of cheapFunction() should be memoized independently from the
// call to expensiveFunction(intermediate), so that expensiveFunction is only
// re-called when the value of intermediate changes, not whenever cheapFunction's
// identity changes.
function useHook() {
  const expensiveFunction = useGetExpensiveFunction();
  const cheapFunction = useGetCheapFunction();

  const intermediate = cheapFunction();

  return expensiveFunction(intermediate);
}
