function Component(props) {
  let x = {};
  // onChange should be inferred as immutable, because the value
  // it captures (`x`) is frozen by the time the function is referenced
  const onChange = e => {
    maybeMutate(x, e.target.value);
  };
  if (props.cond) {
    <div>{x}</div>;
  }
  // ideally this call would be outside the memoization block for `x`
  onChange();
  return <Foo value={x} />;
}
