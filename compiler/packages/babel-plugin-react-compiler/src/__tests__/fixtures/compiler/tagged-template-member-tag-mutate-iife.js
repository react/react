import {identity, makeArray} from 'shared-runtime';

function Component(props) {
  const obj = {tag: props.a};
  return obj.tag`${(function () {
    obj.tag = props.b;
  })()}`;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: makeArray, b: identity}],
};
