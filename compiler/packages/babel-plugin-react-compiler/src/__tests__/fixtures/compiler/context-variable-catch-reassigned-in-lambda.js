// @flow
function Foo() {
  try {
    doSomething();
  } catch (e) {
    e = wrap(e);
    foo(() => e);
  }
  return <div />;
}
