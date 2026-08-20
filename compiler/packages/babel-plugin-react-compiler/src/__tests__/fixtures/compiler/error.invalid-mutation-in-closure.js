function useInvalidMutation(options) {
  function test() {
    foo(options.foo); // error should not point on this line
    options.foo = 'bar';
  }
  return test;
}
