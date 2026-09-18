// @eslintSuppressionRules:["my-plugin/react.rule"]

// The configured suppression rule name contains a literal `.`. It should be
// matched literally rather than treated as a regex wildcard, so a comment
// disabling `my-plugin/reactXrule` must not be treated as a suppression of
// the configured `my-plugin/react.rule`.
function Component(props) {
  'use forget';
  // eslint-disable-next-line my-plugin/reactXrule
  return <div>{props.text}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{text: 'Hello'}],
};
