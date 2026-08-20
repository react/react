function Component(props) {
  const context = useContext(FooContext);
  context.value = props.value;
  return context.value;
}
