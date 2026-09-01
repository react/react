// @eslintSuppressionRules:[]

// The suppression here shouldn't cause compilation to get skipped
// Previously we had a bug where an empty list of suppressions would
// create a regexp that matched any suppression
function Component(props) {
  'use forget';
  // eslint-disable-next-line foo/not-react-related
  return <div>{props.text}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{text: 'Hello'}],
};
