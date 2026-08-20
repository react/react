function Component(props) {
  const x = [];
  const y = x;

  // y isn't reactive yet when we first visit this, so z is initially non-reactive
  const z = [y];

  // then we realize y is reactive. we need a fixpoint to propagate this back to z
  y.push(props.input);

  // PruneNonReactiveDependencies partially propagates reactivity (for now) which
  // we bypass with an indirection of storing into another variable
  const a = [z];

  // b's value is conditional on `a`, which is reactive per above
  let b = 0;
  if (a[0][0][0] === 42) {
    b = 1;
  }

  return [b];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [
    {input: 42},
    {input: 42},
    {input: 'sathya'},
    {input: 'sathya'},
    {input: 42},
    {input: 'sathya'},
    {input: 42},
    {input: 'sathya'},
  ],
};
