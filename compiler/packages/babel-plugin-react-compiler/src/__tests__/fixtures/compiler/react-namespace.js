const FooContext = React.createContext({current: null});

function Component(props) {
  const foo = React.useContext(FooContext);
  const ref = React.useRef();
  const [x, setX] = React.useState(false);
  const onClick = () => {
    setX(true);
    ref.current = true;
  };
  return <div onClick={onClick}>{React.cloneElement(props.children)}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{children: <div>Hello</div>}],
};
