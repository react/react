// The catch param is a source of reactivity: here the caught error depends on
// `prop` (via the TypeError message), so a lambda that captures `e` must be
// recreated when `e` changes rather than memoized once and reused forever.
// The throw site is a property load, not a call, so `e` is not an alias of any
// reactive value and only becomes reactive because it is a catch binding.
function Component({obj, prop}) {
  let message = 'none';
  try {
    message = 'value:' + obj[prop];
  } catch (e) {
    const read = () => e.message;
    message = read();
  }
  return <div>{message}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{obj: null, prop: 'a'}],
  sequentialRenders: [
    {obj: null, prop: 'a'},
    {obj: null, prop: 'a'},
    {obj: null, prop: 'b'},
    {obj: {b: 'ok'}, prop: 'b'},
  ],
};
