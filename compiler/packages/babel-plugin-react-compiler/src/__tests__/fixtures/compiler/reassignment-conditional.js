function Component(props) {
  let x = [];
  x.push(props.p0);
  let y = x;

  if (props.p1) {
    x = [];
  }

  y.push(props.p2);

  return <Component x={x} y={y} />;
}
