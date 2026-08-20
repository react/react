function Component(props) {
  const x = foo(props.x);
  const fn = function () {
    const arr = [...bar(props)];
    return arr.at(x);
  };
  const fnResult = fn();
  return fnResult;
}
