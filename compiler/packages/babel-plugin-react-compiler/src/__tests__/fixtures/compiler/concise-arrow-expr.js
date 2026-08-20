function component() {
  let [x, setX] = useState(0);
  const handler = v => setX(v);
  return <Foo handler={handler}></Foo>;
}
