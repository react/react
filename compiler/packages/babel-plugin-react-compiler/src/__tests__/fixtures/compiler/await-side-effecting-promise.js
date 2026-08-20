async function Component(props) {
  const x = [];
  await populateData(props.id, x);
  return x;
}
