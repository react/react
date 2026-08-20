function Component(props) {
  const items = bar();
  mutate(items.a, props.a);

  const count = foo(items.length + 1);

  return {items, count};
}
