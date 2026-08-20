// @validateNoSetStateInRender
function Component(props) {
  const [x, setX] = useState(0);

  const foo = () => {
    setX(1);
  };

  const bar = () => {
    foo();
  };

  const baz = () => {
    bar();
  };
  baz();

  return [x];
}
