function Component() {
  const foo = () => {
    someGlobal = true;
  };
  // Children are generally access/called during render, so
  // modifying a global in a children function is almost
  // certainly a mistake.
  return <Foo>{foo}</Foo>;
}
