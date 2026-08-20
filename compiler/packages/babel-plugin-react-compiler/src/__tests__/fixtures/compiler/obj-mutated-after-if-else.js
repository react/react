function foo(a, b, c, d) {
  let x = someObj();
  if (a) {
    x = someObj();
  } else {
    x = someObj();
  }

  x.f = 1;
  return x;
}
