// Should print A, B, arg, original
function Component() {
  const changeF = o => {
    o.f = () => console.log('new');
  };
  const x = {
    f: () => console.log('original'),
  };

  (console.log('A'), x)[(console.log('B'), 'f')](
    (changeF(x), console.log('arg'), 1)
  );
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};
