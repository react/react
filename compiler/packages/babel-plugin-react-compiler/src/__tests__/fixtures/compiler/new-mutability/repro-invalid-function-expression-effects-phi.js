function Component({a, b}) {
  const y = {a};
  const x = {b};
  const f = () => {
    let z = null;
    while (z == null) {
      z = x;
    }
    // z is a phi with a backedge, and we don't realize it could be x,
    // and therefore fail to record a Capture x <- y effect for this
    // function expression
    z.y = y;
  };
  f();
  mutate(x);
  return <div>{x}</div>;
}
