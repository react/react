// Note that `a?.b.c` is semantically different from `(a?.b).c`
// We should codegen the correct member expressions
function Component(props) {
  let x = props?.b.c;
  let y = props?.b.c.d?.e.f.g?.h;
  return {x, y};
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
