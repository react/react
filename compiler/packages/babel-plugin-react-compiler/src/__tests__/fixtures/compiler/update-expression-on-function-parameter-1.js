function Component({a: a, b: [b], c: {c}}) {
  let d = a++;
  let e = ++a;
  let f = b--;
  let g = --b;
  let h = c++;
  let i = --c;
  return [a, b, c, d, e, f, g, h, i];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 2, b: [3], c: {c: 4}}],
  isComponent: false,
};
