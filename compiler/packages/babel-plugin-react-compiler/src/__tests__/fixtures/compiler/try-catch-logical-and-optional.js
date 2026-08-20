function Component({cond, obj, items}) {
  try {
    // items.length is accessed WITHIN the && expression
    const result = cond && obj?.value && items.length;
    return <div>{String(result)}</div>;
  } catch {
    return <div>error</div>;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: true, obj: {value: 'hello'}, items: [1, 2]}],
  sequentialRenders: [
    {cond: true, obj: {value: 'hello'}, items: [1, 2]},
    {cond: true, obj: {value: 'hello'}, items: [1, 2]},
    {cond: true, obj: {value: 'world'}, items: [1, 2, 3]},
    {cond: false, obj: {value: 'hello'}, items: [1]},
    {cond: true, obj: null, items: [1]},
    {cond: true, obj: {value: 'test'}, items: null}, // errors because items.length throws WITHIN the && chain
    {cond: null, obj: {value: 'test'}, items: [1]},
  ],
};
