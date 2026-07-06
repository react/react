/**
 * `using` declarations (explicit resource management) are currently lowered
 * as plain `const`: the compiled output memoizes the resource and drops the
 * implicit `[Symbol.dispose]()` call at scope exit. The compiler should bail
 * out on this unsupported syntax instead of changing program semantics.
 */
function Component(props) {
  using resource = getResource(props.id);
  return <div>{resource.data}</div>;
}
