function Component(props) {
  const x = new Foo(...props.foo, null, ...[props.bar]);
  return x;
}
