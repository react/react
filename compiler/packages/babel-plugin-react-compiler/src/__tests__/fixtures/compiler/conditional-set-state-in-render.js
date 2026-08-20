function Component(props) {
  const [x, setX] = useState(0);

  const foo = () => {
    setX(1);
  };

  if (props.cond) {
    setX(2);
    foo();
  }

  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
