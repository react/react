function g(props) {
  const a = {b: {c: props.c}};
  a.b.c = a.b.c + 1;
  a.b.c *= 2;
  return a;
}

export const FIXTURE_ENTRYPOINT = {
  fn: g,
  params: [{c: 2}],
  isComponent: false,
};
