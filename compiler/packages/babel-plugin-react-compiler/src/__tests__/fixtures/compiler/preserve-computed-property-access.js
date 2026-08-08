function Component() {
  const namespace = useParams()['namespace'];
  return <div>{namespace}</div>;
}

function OtherComponent(props) {
  return <div>{props['external']}</div>;
}

function ConstantKeyComponent(props) {
  const key = 'external';
  return <div>{props[key]}</div>;
}

function OptionalComponent(props) {
  return <div>{props?.['external']}</div>;
}
