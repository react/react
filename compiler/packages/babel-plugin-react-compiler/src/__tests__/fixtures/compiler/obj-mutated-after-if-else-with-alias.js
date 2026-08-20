function foo(a, b, c, d) {
  let x = someObj();
  if (a) {
    const y = someObj();
    const z = y;
    x = z;
  } else {
    x = someObj();
  }

  x.f = 1;
  return x;
}
