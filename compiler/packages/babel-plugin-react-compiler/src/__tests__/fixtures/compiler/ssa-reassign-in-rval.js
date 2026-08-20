// Forget should call the original x (x = foo()) to compute result
function Component() {
  let x = foo();
  let result = x((x = bar()), 5);
  return [result, x];
}
