// Function declarations are instantiated at function entry, so `typeof props`
// observes the function (not the parameter) in uncompiled JS. The compiler
// lowers the declaration as a reassignment at its source position, which
// would evaluate `typeof props` to "object"; bail out instead.
function Component(props) {
  const before = typeof props;
  function props() {}
  return <p>{before}</p>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: 1}],
};
