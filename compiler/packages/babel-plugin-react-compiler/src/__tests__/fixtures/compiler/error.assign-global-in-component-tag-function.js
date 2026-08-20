function Component() {
  const Foo = () => {
    someGlobal = true;
  };
  return <Foo />;
}
