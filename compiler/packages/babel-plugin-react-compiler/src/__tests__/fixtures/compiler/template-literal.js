function componentA(props) {
  let t = `hello ${props.a}, ${props.b}!`;
  t += ``;
  return t;
}

function componentB(props) {
  let x = useFoo(`hello ${props.a}`);
  return x;
}
