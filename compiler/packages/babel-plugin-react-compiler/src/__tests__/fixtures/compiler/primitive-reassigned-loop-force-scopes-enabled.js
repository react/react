// @enablePreserveExistingMemoizationGuarantees
function Component({base, start, increment, test}) {
  let value = base;
  for (let i = start; i < test; i += increment) {
    value += i;
  }
  return <div>{value}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{base: 0, start: 0, test: 10, increment: 1}],
  sequentialRenders: [
    {base: 0, start: 1, test: 10, increment: 1},
    {base: 0, start: 0, test: 10, increment: 2},
    {base: 2, start: 0, test: 10, increment: 2},
    {base: 0, start: 0, test: 11, increment: 2},
  ],
};
