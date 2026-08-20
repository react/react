// @compilationMode:"infer"
import {makeArray} from 'shared-runtime';

function Component() {
  const items = makeArray('foo', 'bar', '', null, 'baz', false, 'merp');
  const classname = cx.namespace(...items.filter(isNonEmptyString));
  return <div className={classname}>Ok</div>;
}

function isNonEmptyString(s) {
  return typeof s === 'string' && s.trim().length !== 0;
}

const cx = {
  namespace(...items) {
    return items.join(' ');
  },
};

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
