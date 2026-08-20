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
  return <Foo value={x} onChange={onChange} />;
}
