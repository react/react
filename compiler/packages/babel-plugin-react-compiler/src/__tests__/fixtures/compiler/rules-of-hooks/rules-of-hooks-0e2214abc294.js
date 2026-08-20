// Valid because exceptions abort rendering
function RegressionTest() {
  if (page == null) {
    throw new Error('oh no!');
  }
  useState();
}
