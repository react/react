function Component(props) {
  let x = null;
  if (props.cond) {
    x = Foo.useFoo();
  }
  return x;
}
