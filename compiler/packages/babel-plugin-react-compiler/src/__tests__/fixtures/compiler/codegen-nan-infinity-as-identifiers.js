// Constant propagation can produce NaN/Infinity from arithmetic.
// These must be emitted as Identifier("NaN")/Identifier("Infinity"),
// not NumericLiteral(NaN) which serializes to null in JSON.

function Component({x}) {
  const nan = 0 / 0;
  const inf = 1 / 0;
  const negInf = -1 / 0;
  return (
    <div>
      {x ? nan : inf}
      {negInf}
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: true}],
};
