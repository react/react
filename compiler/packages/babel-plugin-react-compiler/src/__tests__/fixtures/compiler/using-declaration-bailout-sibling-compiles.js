// @panicThreshold:"none"
function ComponentWithUsing(props) {
  using resource = getResource(props.id);
  return <div>{resource.data}</div>;
}

function ValidComponent(props) {
  return <div>{props.greeting}</div>;
}
