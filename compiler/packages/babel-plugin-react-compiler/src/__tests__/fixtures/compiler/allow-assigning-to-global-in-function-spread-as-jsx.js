// @enableNewMutationAliasingModel:false
function Component() {
  const foo = () => {
    someGlobal = true;
  };
  // spreading a function is weird, but it doesn't call the function so this is allowed
  return <div {...foo} />;
}
