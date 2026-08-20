function Component(props) {
  const ref = useRef(null);
  const onChange = e => {
    const newValue = e.target.value ?? ref.current;
    ref.current = newValue;
  };
  useEffect(() => {
    console.log(ref.current);
  });
  return <Foo onChange={onChange} />;
}
