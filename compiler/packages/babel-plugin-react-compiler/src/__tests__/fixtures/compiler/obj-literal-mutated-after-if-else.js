function foo(a, b, c, d) {
  let x = {};
  if (someVal) {
    x = {b};
  } else {
    x = {c};
  }

  x.f = 1;
  return x;
}
