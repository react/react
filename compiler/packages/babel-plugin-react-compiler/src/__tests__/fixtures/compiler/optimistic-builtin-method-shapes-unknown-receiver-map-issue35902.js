// @enableOptimisticBuiltinMethodShapes

/**
 * Regression test for https://github.com/facebook/react/issues/35902
 *
 * `expensiveProcessing(data)` returns a value with an unknown type. Calling the
 * known non-mutating builtin `.map` on it should NOT extend the receiver's
 * mutable range, so `expensiveProcessing(data)` gets its own reactive scope
 * keyed only on `data` -- it must not re-run when only `onClick` changes.
 *
 * With @enableOptimisticBuiltinMethodShapes the `.map` receiver resolves to the
 * builtin Array shape, whose `map` reads (rather than conditionally mutates)
 * the receiver. Compare with the -flag-off variant, which keeps the
 * conservative behavior where `expensiveProcessing` is merged into a scope
 * keyed on both `data` and `onClick`.
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
