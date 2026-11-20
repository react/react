let counter = 0;

function Component() {
  function press() {
    counter = counter + 1;
    later();
  }
  function later() {}
  return <button onClick={press} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
