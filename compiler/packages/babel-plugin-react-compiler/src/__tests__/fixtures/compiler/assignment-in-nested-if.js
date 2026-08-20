function useBar(props) {
  let z;

  if (props.a) {
    if (props.b) {
      z = baz();
    }
  }

  return z;
}
