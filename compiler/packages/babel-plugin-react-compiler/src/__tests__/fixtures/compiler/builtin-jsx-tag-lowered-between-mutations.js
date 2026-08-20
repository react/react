function Component(props) {
  const maybeMutable = new MaybeMutable();
  return <div>{maybeMutate(maybeMutable)}</div>;
}
