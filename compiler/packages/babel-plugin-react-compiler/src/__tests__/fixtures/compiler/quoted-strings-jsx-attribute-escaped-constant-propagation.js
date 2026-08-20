export function Component() {
  // Test what happens if a string with double-quotes is interpolated via constant propagation
  const text = 'Some "text"';
  return <Child text={text} />;
}

function Child(props) {
  return props.text;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
