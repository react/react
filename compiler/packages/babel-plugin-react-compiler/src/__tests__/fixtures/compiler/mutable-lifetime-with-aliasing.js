function mutate(x, y) {
  'use no forget';
  if (!Array.isArray(x.value)) {
    x.value = [];
  }
  x.value.push(y);
  if (y != null) {
    y.value = x;
  }
}

function Component(props) {
  const a = {};
  const b = [a]; // array elements alias
  const c = {};
  const d = {c}; // object values alias

  // capture all the values into this object
  const x = {};
  x.b = b;
  const y = mutate(x, d); // mutation aliases the arg and return value

  // all of these tests are seemingly readonly, since the values are never directly
  // mutated again. but they are all aliased by `x`, which is later modified, and
  // these are therefore mutable references:
  if (a) {
  }
  if (b) {
  }
  if (c) {
  }
  if (d) {
  }
  if (y) {
  }

  // could in theory mutate any of a/b/c/x/z, so the above should be inferred as mutable
  mutate(x, null);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  isComponent: false,
};
