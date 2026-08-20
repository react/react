// @debug @enablePreserveExistingMemoizationGuarantees:false
function Component(props) {
  const x = makeObject();
  const y = delete x[props.value];
  return y;
}
