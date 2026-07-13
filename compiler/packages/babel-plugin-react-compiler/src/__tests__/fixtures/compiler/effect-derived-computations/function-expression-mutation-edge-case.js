// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"

function Component() {
  const [foo, setFoo] = useState({});
  const [bar, setBar] = useState(new Set());

  /*
   * isChanged is considered context of the effect's function expression,
   * if we don't bail out of effect mutation derivation tracking, isChanged
   * will inherit the sources of the effect's function expression.
   *
   * This is innacurate and with the multiple passes ends up causing an infinite loop.
   */
  useEffect(() => {
    let isChanged = false;

    const newData = foo.map(val => {
      bar.someMethod(val);
      isChanged = true;
    });

    if (isChanged) {
      setFoo(newData);
    }
  }, [foo, bar]);

  return (
    <div>
      {foo}, {bar}
    </div>
  );
}
