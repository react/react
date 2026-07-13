// @validateNoSetStateInRender @enableTreatSetIdentifiersAsStateSetters
function Component({setX}) {
  const aliased = setX;

  setX(1);
  aliased(2);

  return x;
}
