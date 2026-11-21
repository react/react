function Component({condition}) {
  let value;
  if (condition) {
    value = 0;
  } else {
    value = -0;
  }
  return <div>{1 / value}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{condition: true}],
  sequentialRenders: [{condition: true}, {condition: false}, {condition: true}],
};
