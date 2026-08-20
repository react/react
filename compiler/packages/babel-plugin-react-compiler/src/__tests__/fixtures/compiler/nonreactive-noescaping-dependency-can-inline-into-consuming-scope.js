// @flow
function Component() {
  return (
    <div
      className={stylex(
        // this value is a) in its own scope, b) non-reactive, and c) non-escaping
        // its scope gets pruned bc it's non-escaping, but this doesn't mean we need to
        // create a temporary for it
        flags.feature('feature-name') ? styles.featureNameStyle : null
      )}></div>
  );
}
