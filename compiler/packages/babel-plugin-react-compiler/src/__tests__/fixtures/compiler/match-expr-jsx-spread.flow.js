// @flow
// Match expression with JSX spread attribute inside an arm.
// The spread attribute ({...props}) references a captured variable from the
// outer component scope. collect_identifier_positions_from_expr must handle
// JSXSpreadAttribute to detect this capture.

export default component MatchExprJsxSpread(
  label: ?{outcome: string},
  ...props: {color?: string}
) {
  return match (label?.outcome) {
    'A' => <div color="green" {...props} />,
    _ => <div color="gray" {...props} />,
  };
}
