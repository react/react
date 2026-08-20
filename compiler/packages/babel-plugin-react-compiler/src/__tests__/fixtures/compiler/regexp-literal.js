function Component(props) {
  const pattern = /foo/g;
  const value = makeValue();
  // We treat RegExp instances as mutable objects (bc they are)
  // so by default we assume this could be mutating `value`:
  if (pattern.test(value)) {
    return <div>{value}</div>;
  }
  return <div>Default</div>;
}
