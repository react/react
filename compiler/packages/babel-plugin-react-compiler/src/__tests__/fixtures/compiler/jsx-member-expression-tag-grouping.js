function Component(props) {
  const maybeMutable = new MaybeMutable();
  return <Foo.Bar>{maybeMutate(maybeMutable)}</Foo.Bar>;
}
