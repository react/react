function Component(props) {
  const [x, setX] = useState(null);

  const onChange = e => {
    let x = null; // intentionally shadow the original x
    setX(currentX => currentX + x); // intentionally refer to shadowed x
  };

  return <input value={x} onChange={onChange} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
