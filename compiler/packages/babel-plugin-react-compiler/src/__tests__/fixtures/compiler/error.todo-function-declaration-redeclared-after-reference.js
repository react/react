// Duplicate function declarations are hoisted and the last one wins, so
// `fmt()` returns 'b' in uncompiled JS. The compiler lowers the second
// declaration as a reassignment at its source position, which would make
// `fmt()` return 'a'; bail out instead.
function Component() {
  function fmt() {
    return 'a';
  }
  const x = fmt();
  function fmt() {
    return 'b';
  }
  return <p>{x}</p>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
