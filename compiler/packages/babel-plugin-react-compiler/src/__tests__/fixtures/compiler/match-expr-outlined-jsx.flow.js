// @flow @enableJsxOutlining
// Match expression inside a component with JSX outlining enabled.
// Hermes desugars match into a synthetic arrow with parameter $$gen$m0 at
// position 0. When JSX outlining moves this into an outlined _temp function,
// $$gen$m0 must NOT get a $0 suffix from rename_variables — it is a local
// parameter, not a global.

export default component MatchExprOutlinedJsx(
  item: ?{status: string},
  label: string
) {
  return (
    <div>
      {
        match (item?.status) {
          'active' => <span>{label}</span>,
          _ => <span>{'none'}</span>,
        }
      }
    </div>
  );
}
