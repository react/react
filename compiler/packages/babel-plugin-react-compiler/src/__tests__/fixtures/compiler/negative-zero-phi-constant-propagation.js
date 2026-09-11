function Component({sign}) {
  let x;
  if (sign) {
    x = 0;
  } else {
    x = -0;
  }
  // `1 / x` reveals the sign of zero: `Infinity` for `0`, `-Infinity` for
  // `-0`. This lets us assert (via the eval fixture harness comparing the
  // compiled and uncompiled output) that Object.is(x, -0) parity is
  // preserved through the compiler's constant propagation and codegen.
  return <div>{`1/x=${1 / x}`}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{sign: true}],
  sequentialRenders: [
    {sign: true},
    {sign: false},
    {sign: false},
    {sign: true},
  ],
};
