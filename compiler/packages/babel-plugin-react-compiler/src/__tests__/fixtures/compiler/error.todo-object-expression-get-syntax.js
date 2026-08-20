function Component({value}) {
  const object = {
    get value() {
      return value;
    },
  };
  return <div>{object.value}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [{value: 0}],
  sequentialRenders: [{value: 1}, {value: 2}],
};
