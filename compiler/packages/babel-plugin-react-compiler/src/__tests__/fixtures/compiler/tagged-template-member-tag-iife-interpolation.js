import {print} from 'shared-runtime';

const obj = {
  prefix: 'obj',
  tag(strings, value) {
    return this.prefix + value;
  },
};

// The IIFE is emitted as statements, but the tag load must stay attached to the call
function Component(props) {
  return props.obj.tag`${(() => {
    print(1);
    return 1;
  })()}`;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{obj}],
};
