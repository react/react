// @validateNoImpureFunctionsInRender
function Component() {
  const read = () => later();
  const later = () => Date.now();
  const now = read();
  return <div>{now}</div>;
}
