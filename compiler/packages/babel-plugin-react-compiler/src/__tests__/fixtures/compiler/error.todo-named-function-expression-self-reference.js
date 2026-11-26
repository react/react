// Regression for #37058: passing a named function's self-reference to a call.
export function MyComponent() {
  return (
    <HelloWorld
      onClick={() => {
        foo(function bar() {
          if (Math.random() > 0.5) {
            baz();
          } else {
            qux(bar);
          }
        });
      }}
    />
  );
}
