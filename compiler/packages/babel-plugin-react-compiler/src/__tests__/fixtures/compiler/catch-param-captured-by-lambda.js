// @flow
function Foo() {
  try {
    doSomething();
  } catch (e) {
    foo(() => e);
  }
  return <div />;
}
