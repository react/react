// To preserve the nullthrows behavior and reactive deps of this code,
// Forget needs to add `props.a.b` or a subpath as a dependency.
//
// (1) Since the reactive block producing x unconditionally read props.a.<...>,
//     reading `props.a.b` outside of the block would still preserve nullthrows
//     semantics of source code
// (2) Technically, props.a, props.a.b, and props.a.b.c are all reactive deps.
//     However, `props.a?.b` is only dependent on whether `props.a` is nullish,
//     not its actual value. Since we already preserve nullthrows on `props.a`,
//     we technically do not need to add `props.a` as a dependency.

function Component(props) {
  let x = [];
  x.push(props.a?.b);
  x.push(props.a.b.c);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: {b: {c: 1}}}],
};
