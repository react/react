// @flow
function Foo() {
  function hasError() {
    let hasError = false;
    return hasError;
  }
  return <div x={hasError} />;
}
