// Valid because the loop doesn't change the order of hooks calls.
function RegressionTest() {
  const res = [];
  const additionalCond = true;
  for (let i = 0; i !== 10 && additionalCond; ++i) {
    res.push(i);
  }
  React.useLayoutEffect(() => {});
}
