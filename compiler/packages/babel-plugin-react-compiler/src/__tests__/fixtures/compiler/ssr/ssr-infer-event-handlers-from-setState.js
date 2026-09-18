// @outputMode:"ssr"
function Component() {
  const [state, setState] = useState(0);
  const ref = useRef(null);
  const onChange = e => {
    // The known setState call allows us to infer this as an event handler
    // and prune it
    setState(e.target.value);
  };
  useEffect(() => {
    log(ref.current.value);
  });
  return <CustomInput value={state} onChange={onChange} ref={ref} />;
}
