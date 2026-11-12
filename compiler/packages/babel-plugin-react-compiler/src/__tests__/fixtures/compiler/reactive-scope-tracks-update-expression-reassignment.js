// A local that is only mutated with an update expression (`++`/`--`) inside a
// reactive scope must still be saved and restored by that scope, the same way a
// `StoreLocal` reassignment (`+=`) is. Otherwise a later render that reuses the
// memoized scope observes the value from the first render.

function Summary({tick}) {
  function isEven(i) {
    return i % 2 === 0;
  }
  let even = 0;
  let oddSum = 0;
  for (let i = 0; i < 4; i++) {
    if (isEven(i)) {
      even++;
    } else {
      oddSum += i;
    }
  }
  return (
    <p>
      render {tick}: even={even} oddSum={oddSum}
    </p>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Summary,
  params: [{tick: 0}],
  sequentialRenders: [{tick: 0}, {tick: 1}],
};
