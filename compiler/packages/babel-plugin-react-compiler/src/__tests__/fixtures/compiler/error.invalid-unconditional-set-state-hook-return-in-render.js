// @validateNoSetStateInRender @enableTreatSetIdentifiersAsStateSetters
function Component() {
  const [state, setState] = useCustomState(0);
  const aliased = setState;

  setState(1);
  aliased(2);

  return state;
}

function useCustomState(init) {
  return useState(init);
}
