// Per spec, the object and computed property of a member expression lvalue
// are evaluated before the right-hand side. `a[i++] = i` must store into
// index 0 while the rhs observes the incremented value of `i`.
function Component() {
  const a = [0, 0];
  let i = 0;
  a[i++] = i;

  const b = [0, 0];
  let j = 0;
  b[j] = ++j;

  const c = [0, 0];
  let k = 0;
  c[k] = (k++, k);

  return [a, b, c];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};
