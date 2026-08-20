// @validateExhaustiveMemoizationDependencies:false
function component() {
  const [count, setCount] = useState(0);
  const increment = useCallback(() => setCount(count + 1));

  return <Foo onClick={increment}></Foo>;
}
