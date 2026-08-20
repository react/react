function foo(a, b, c, d) {
  let x = someObj();
  if (a) {
    let z;
    if (b) {
      const w = someObj();
      z = w;
    } else {
      z = someObj();
    }
    const y = z;
    x = z;
  } else {
    x = someObj();
  }

  x.f = 1;
  return x;
}
