function Component() {
  'use strict';
  let [count, setCount] = React.useState(0);
  function update() {
    'worklet';
    setCount(count => count + 1);
  }
  return <button onClick={update}>{count}</button>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: true,
};
