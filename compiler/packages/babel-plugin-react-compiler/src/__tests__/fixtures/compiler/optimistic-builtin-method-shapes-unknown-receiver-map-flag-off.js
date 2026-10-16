/**
 * Anchor documenting the DEFAULT (flag-off) behavior for
 * https://github.com/facebook/react/issues/35902
 *
 * Without @enableOptimisticBuiltinMethodShapes, `expensiveProcessing(data)` has
 * an unknown type and `.map` is treated conservatively (may mutate its
 * receiver). The receiver's mutable range is extended through the `.map` call
 * and merged with the `onClick`-capturing callback, so `expensiveProcessing`
 * ends up in a reactive scope keyed on BOTH `data` and `onClick` -- meaning it
 * re-runs whenever `onClick` changes. This is the bug the flag opts out of; see
 * the -issue35902 variant for the fixed output.
 */
function ExpensiveComponent({data, onClick}) {
  const processedData = expensiveProcessing(data);

  const handleClick = item => {
    onClick(item.id);
  };

  return (
    <div>
      {processedData.map(item => (
        <Item key={item.id} onClick={() => handleClick(item)} />
      ))}
    </div>
  );
}
