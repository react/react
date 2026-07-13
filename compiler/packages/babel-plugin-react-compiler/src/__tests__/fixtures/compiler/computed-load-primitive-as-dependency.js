// @enablePreserveExistingMemoizationGuarantees:false
function Component(props) {
  let a = foo();
  // freeze `a` so we know the next line cannot mutate it
  <div>{a}</div>;

  // b should be dependent on `props.a`
  let b = bar(a[props.a] + 1);
  return b;
}
