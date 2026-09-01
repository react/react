// @loggerTestOnly @validateStaticComponents @outputMode:"lint"
function Example(props) {
  const Component = props.foo.bar();
  return <Component />;
}
