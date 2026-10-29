// @enableOptimisticBuiltinMethodShapes

/**
 * Negative case: even with @enableOptimisticBuiltinMethodShapes enabled, a
 * method whose name is NOT a known non-mutating builtin collection method
 * (here a custom `.process(...)`) must be handled conservatively. The unknown
 * receiver keeps no shape, so the call may mutate it and `expensiveProcessing`
 * stays merged into a scope keyed on both `data` and `onClick` -- identical to
 * the flag-off behavior.
 */
function ExpensiveComponent({data, onClick}) {
  const processedData = expensiveProcessing(data);

  const handleClick = item => {
    onClick(item.id);
  };

  return (
    <div>
      {processedData.process(item => (
        <Item key={item.id} onClick={() => handleClick(item)} />
      ))}
    </div>
  );
}
