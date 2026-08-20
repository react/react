function Component() {
  // a's mutable range should be limited
  // the following line
  let a = someObj();

  let x = [];
  x.push(a);

  return [x, a];
}
