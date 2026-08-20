function Component() {
  let callback = () => {
    callback = null;
  };
  return <div onClick={callback} />;
}
