function Component(props) {
  let x = [];

  let _ = <Component x={x} />;

  // x is Frozen at this point
  x.push(props.p2);

  return <div>{_}</div>;
}
