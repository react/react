function Component(props) {
  // a and b are independent but their mutations are interleaved, so
  // they get grouped in a reactive scope. this means that a becomes
  // reactive since it will effectively re-evaluate based on a reactive
  // input
  const a = [];
  const b = [];
  b.push(props.cond);
  a.push(0);

  // Downstream consumer of a, which initially seems non-reactive except
  // that a becomes reactive, per above
  const c = [a];

  let x;
  for (let i = c[0][0]; i < 10; i++) {
    x = 1;
  }
  // The values assigned to `x` are non-reactive, but the value of `x`
  // depends on the "control" value `c[0]` which becomes reactive via
  // being interleaved with `b`.
  // Therefore x should be treated as reactive too.
  return [x];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: true}],
};
