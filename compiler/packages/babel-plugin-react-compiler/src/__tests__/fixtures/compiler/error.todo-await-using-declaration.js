async function Component(props) {
  await using resource = getResource(props.id);
  return <div>{resource.data}</div>;
}
