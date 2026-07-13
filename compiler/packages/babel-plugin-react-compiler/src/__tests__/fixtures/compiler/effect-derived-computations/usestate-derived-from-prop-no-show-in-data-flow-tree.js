// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"

function Component({prop}) {
  const [s, setS] = useState();
  const [second, setSecond] = useState(prop);

  /*
   * `second` is a source of state. It will inherit the value of `prop` in
   * the first render, but after that it will no longer be updated when
   * `prop` changes. So we shouldn't consider `second` as being derived from
   * `prop`
   */
  useEffect(() => {
    setS(second);
  }, [second]);

  return <div>{s}</div>;
}
