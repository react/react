/**
 * Fixture showing `@babel/generator` bug with jsx attribute strings containing
 * escape sequences. Note that this is only a problem when generating jsx
 * literals.
 *
 * When using the jsx transform to correctly lower jsx into
 * `React.createElement` calls, the escape sequences are preserved correctly
 * (see evaluator output).
 */
function MyApp() {
  return <input pattern="\w" />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: MyApp,
  params: [],
};
