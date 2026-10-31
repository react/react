// @loggerTestOnly @outputMode:"lint" @enableLintFastPath @expectNothingCompiled
/**
 * Functions without manual memoization stop compiling after the last
 * validation pass, so no CompileSuccess event is logged.
 */
function Component(props) {
  return <div>{props.value}</div>;
}
