function Component() {
  let callback = () => {
    onClick = () => {};
  };
  let onClick;

  return <div onClick={callback} />;
}
