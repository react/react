function component(a) {
  let x = useMemo(() => [a], [a]);
  return <Foo x={x}></Foo>;
}
