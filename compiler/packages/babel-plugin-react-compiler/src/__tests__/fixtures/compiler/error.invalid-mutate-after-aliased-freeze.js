function Component(props) {
  let x = [];
  let y = x;

  if (props.p1) {
    x = [];
  }

  let _ = <Component x={x} />;

  // y is MaybeFrozen at this point, since it may alias to x
  // (which is the above line freezes)
  y.push(props.p2);

  return <Component x={x} y={y} />;
}
