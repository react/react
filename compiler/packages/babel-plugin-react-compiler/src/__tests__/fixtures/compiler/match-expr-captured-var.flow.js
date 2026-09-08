// @flow
// Match expression with optional chaining in discriminant.
// Hermes desugars this into a synthetic IIFE that captures `y` from the outer scope.
// The IIFE has start=end=0, requiring synthetic scope resolution to find captured context.

export default component MatchExprCapturedVar(x: ?{v: string}, y: number) {
  return match (x?.v) {
    'a' => y + 1,
    _ => y + 2,
  };
}
