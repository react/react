function Component() {
  let value: number | undefined;
  const a = async () => {
    value = 1;
  };
  const b = async () => {
    value = 2;
  };
  return <div>{[a, b]}</div>;
}
