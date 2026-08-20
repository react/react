// @debug
function Component(a, b) {
  let x = [];
  let y = [];
  let z = foo(a);
  if (FLAG) {
    x = bar(z);
    y = baz(b);
  }
  return [x, y];
}
