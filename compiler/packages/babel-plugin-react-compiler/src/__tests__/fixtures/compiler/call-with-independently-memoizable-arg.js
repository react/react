function Component(props) {
  const x = makeFunction(props);
  const y = x(
    <div>
      <span>{props.text}</span>
    </div>
  );
  return y;
}
