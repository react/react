function Component(props) {
  const f = () => {
    props.value = true;
  };
  const g = () => {
    f();
  };
  g();
}
