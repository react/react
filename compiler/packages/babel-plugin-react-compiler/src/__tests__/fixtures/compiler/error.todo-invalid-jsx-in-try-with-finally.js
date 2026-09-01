// @validateNoJSXInTryStatements @outputMode:"lint"
function Component(props) {
  let el;
  try {
    el = <div />;
  } finally {
    console.log(el);
  }
  return el;
}
