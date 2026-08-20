// @validateNoCapitalizedCalls
function Foo() {
  let x = Bar;
  x(); // ERROR
}
