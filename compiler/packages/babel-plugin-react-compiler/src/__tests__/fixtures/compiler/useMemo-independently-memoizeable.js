// @validateExhaustiveMemoizationDependencies:false
function Component(props) {
  const [a, b] = useMemo(() => {
    const items = [];
    const a = makeObject(props.a);
    const b = makeObject(props.b);
    return [a, b];
  });
  return [a, b];
}
