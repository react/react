
## Input

```javascript
// @loggerTestOnly @outputMode:"lint" @enableLintFastPath @expectNothingCompiled
/**
 * Functions without manual memoization stop compiling after the last
 * validation pass, so no CompileSuccess event is logged.
 */
function Component(props) {
  return <div>{props.value}</div>;
}

```

## Code

```javascript
// @loggerTestOnly @outputMode:"lint" @enableLintFastPath @expectNothingCompiled
/**
 * Functions without manual memoization stop compiling after the last
 * validation pass, so no CompileSuccess event is logged.
 */
function Component(props) {
  return <div>{props.value}</div>;
}

```
      
### Eval output
(kind: exception) Fixture not implemented