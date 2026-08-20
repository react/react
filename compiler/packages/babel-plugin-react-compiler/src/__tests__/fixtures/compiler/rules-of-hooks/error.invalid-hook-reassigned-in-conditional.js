function Component(props) {
  let y;
  props.cond ? (y = useFoo) : null;
  return y();
}
