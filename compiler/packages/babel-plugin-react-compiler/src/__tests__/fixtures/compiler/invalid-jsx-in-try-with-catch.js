// @loggerTestOnly @validateNoJSXInTryStatements @outputMode:"lint"
function Component(props) {
  let el;
  try {
    el = <div />;
  } catch {
    return null;
  }
  return el;
}
