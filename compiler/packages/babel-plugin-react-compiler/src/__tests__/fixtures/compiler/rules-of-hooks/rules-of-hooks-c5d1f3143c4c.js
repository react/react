// Regression test for incorrectly flagged valid code.
function RegressionTest() {
  const foo = cond ? a : b;
  useState();
}
