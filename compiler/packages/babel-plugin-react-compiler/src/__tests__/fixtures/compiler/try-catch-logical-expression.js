function Component(props) {
  let result;
  try {
    // items.length is accessed WITHIN the && expression
    result = props.cond && props.foo && props.items.length;
  } catch (e) {
    result = 'error';
  }
  return result;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: true, foo: true, items: [1, 2, 3]}],
  sequentialRenders: [
    {cond: true, foo: true, items: [1, 2, 3]},
    {cond: true, foo: true, items: [1, 2, 3]},
    {cond: true, foo: true, items: [1, 2, 3, 4]},
    {cond: false, foo: true, items: [1, 2, 3]},
    {cond: true, foo: false, items: [1, 2, 3]},
    {cond: true, foo: true, items: null}, // errors because props.items.length throws
    {cond: null, foo: true, items: [1]},
  ],
};
