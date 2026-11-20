// @validateExhaustiveMemoizationDependencies:false
function Component(props) {
  const [state, setState] = useState(null);
  // oxlint-disable-next-line react-hooks/rules-of-hooks
  if (props.cond) useEffect(() => setState(props.value));
  return <div>{state}</div>;
}
