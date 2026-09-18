// @flow
// Match statement with const arrow function that references itself inside an arm.
// Hermes desugars the match into a labeled block with synthetic if-bodies at
// position 0. The const declaration needs correct block scope resolution (not
// the Program scope) to avoid broken hoisting.

export default component MatchStmtSelfRefConst(x: string) {
  match (x) {
    'a' => {
      const handler = () => {
        handler();
      };
      document.addEventListener('click', handler);
    }
    _ => {}
  }
  return <div />;
}
