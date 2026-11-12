import {Stringify} from 'shared-runtime';

function Component({value}) {
  const obj = {x: value, a: 0, full: 1};
  const calls = {key: 0, rhs: 0};
  function key() {
    calls.key += 1;
    return 'a';
  }
  function rhs(result) {
    calls.rhs += 1;
    return result;
  }
  // Nullish target: assigns, evaluating the right side once
  obj.x ??= rhs('fallback');
  // Computed target: key() must evaluate exactly once
  obj[key()] ||= rhs('updated');
  // Non-nullish target: skips the assignment without evaluating the right side
  const skipped = (obj.full ??= rhs('skipped'));
  return <Stringify obj={obj} calls={calls} skipped={skipped} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: null}],
};
