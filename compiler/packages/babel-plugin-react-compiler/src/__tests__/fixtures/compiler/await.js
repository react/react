async function Component(props) {
  const user = await load(props.id);
  return <div>{user.name}</div>;
}
