let counter = 0;

function Component() {
  function bump() {
    counter = counter + 1;
    later();
  }
  function later() {}
  bump();
  return <div />;
}
