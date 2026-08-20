function hoisting() {
  function addOne(b) {
    // a is undefined (only the declaration is hoisted, not the init) but shouldn't throw
    return a + b;
  }
  const result = addOne(2);
  var a = 1;

  return result; // OK: returns NaN. The code is semantically wrong but technically correct
}

export const FIXTURE_ENTRYPOINT = {
  fn: hoisting,
  params: [],
  isComponent: false,
};
