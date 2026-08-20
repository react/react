function component() {
  let x = {u: makeSomePrimitive(), v: makeSomePrimitive()};
  let u = x.u;
  let v = x.v;
  if (u > v) {
  }

  let y = x.u;
  let z = x.v;
  return z;
}
