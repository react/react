// @validateNoImpureFunctionsInRender @enableNewMutationAliasingModel

function Component() {
  const date = new Date();
  const time = new Date().getTime();
  const year = new Date().getFullYear();
  return <Foo date={date} time={time} year={year} />;
}
