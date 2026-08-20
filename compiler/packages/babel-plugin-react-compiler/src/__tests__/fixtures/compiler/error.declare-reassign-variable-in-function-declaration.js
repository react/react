function Component() {
  let x = null;
  function foo() {
    x = 9;
  }
  const y = bar(foo);
  return <Child y={y} />;
}
