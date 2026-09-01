// @outputMode:"ssr"
function Component() {
  const [state, setState] = useState(0);
  const ref = useRef(null);
  const onChange = e => {
    setState(e.target.value);
  };
  useEffect(() => {
    log(ref.current.value);
  });
  return <input value={state} onChange={onChange} ref={ref} />;
}
