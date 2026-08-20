function Component(props) {
  let value;
  const object = {
    set value(v) {
      value = v;
    },
  };
  object.value = props.value;
  return <div>{value}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [{value: 0}],
  sequentialRenders: [{value: 1}, {value: 2}],
};
