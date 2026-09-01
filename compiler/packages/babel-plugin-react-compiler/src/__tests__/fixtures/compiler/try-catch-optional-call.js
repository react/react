function Component({obj, arg}) {
  try {
    // arg.value is accessed WITHIN the optional call expression as an argument
    // When obj is non-null but arg is null, arg.value throws inside the optional chain
    const result = obj?.method?.(arg.value);
    return <span>{result ?? 'no result'}</span>;
  } catch {
    return <span>error</span>;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{obj: {method: x => 'called:' + x}, arg: {value: 1}}],
  sequentialRenders: [
    {obj: {method: x => 'called:' + x}, arg: {value: 1}},
    {obj: {method: x => 'called:' + x}, arg: {value: 1}},
    {obj: {method: x => 'different:' + x}, arg: {value: 2}},
    {obj: {method: null}, arg: {value: 3}},
    {obj: {notMethod: true}, arg: {value: 4}},
    {obj: null, arg: {value: 5}}, // obj is null, short-circuits so arg.value is NOT evaluated
    {obj: {method: x => 'test:' + x}, arg: null}, // errors because arg.value throws WITHIN the optional call
  ],
};
