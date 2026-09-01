// @flow

component Foo() {
  const foo = useFoo();
  foo.current = true;
  return <div />;
}
