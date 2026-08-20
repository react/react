function Component(props) {
  const [x, setX] = useState({value: ''});
  const onChange = e => {
    // INVALID! should use copy-on-write and pass the new value
    x.value = e.target.value;
    setX(x);
  };
  return <input value={x.value} onChange={onChange} />;
}
