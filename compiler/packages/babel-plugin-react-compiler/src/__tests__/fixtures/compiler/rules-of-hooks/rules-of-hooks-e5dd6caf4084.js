// Valid because functions can call functions.
function normalFunctionWithConditionalFunction() {
  if (cond) {
    doSomething();
  }
}
