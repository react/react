export function Component() {
  return <Child text='Some "text"' />;
}

function Child(props) {
  return props.text;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
