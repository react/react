function Foo(props) {
  let x = bar(props.a);
  let y = x?.b;

  let z = useBar(y);
  return z;
}
