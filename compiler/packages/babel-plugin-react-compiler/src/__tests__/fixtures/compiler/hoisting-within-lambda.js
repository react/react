function Component({}) {
  const outer = () => {
    const inner = () => {
      return x;
    };
    const x = 3;
    return inner();
  };
  return <div>{outer()}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
