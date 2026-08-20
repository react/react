function Component(props) {
  const maybeMutable = new MaybeMutable();
  let x = props;
  return [x, maybeMutate(maybeMutable)];
}
