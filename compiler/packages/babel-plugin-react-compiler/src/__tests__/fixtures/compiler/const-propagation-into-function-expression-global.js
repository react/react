function foo() {
  const isX = GLOBAL_IS_X;
  const getJSX = () => {
    return <Child x={isX}></Child>;
  };
  const result = getJSX();
  return result;
}
