// @validateNoDerivedComputationsInEffects_exp @enableTreatSetIdentifiersAsStateSetters @loggerTestOnly @outputMode:"lint"

function Component({setParentState, prop}) {
  useEffect(() => {
    setParentState(prop);
  }, [prop]);

  return <div>{prop}</div>;
}
