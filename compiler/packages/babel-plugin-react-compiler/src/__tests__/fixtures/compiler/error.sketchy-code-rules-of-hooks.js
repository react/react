// @validateExhaustiveMemoizationDependencies:false
/* eslint-disable react-hooks/rules-of-hooks */
function lowercasecomponent() {
  const x = [];
  return <div>{x}</div>;
}
/* eslint-enable react-hooks/rules-of-hooks */

export const FIXTURE_ENTRYPOINT = {
  fn: lowercasecomponent,
  params: [],
  isComponent: false,
};
