function Component(props) {
  using resource = getResource(props.id);
  return <div>{resource.data}</div>;
}
