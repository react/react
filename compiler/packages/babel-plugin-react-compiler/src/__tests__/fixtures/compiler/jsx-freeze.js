import {jsx as _jsx} from 'react/jsx-runtime';
import {shallowCopy} from 'shared-runtime';

function Component(props) {
  const childprops = {style: {width: props.width}};
  const element = _jsx('div', {
    childprops: childprops,
    children: '"hello world"',
  });
  shallowCopy(childprops); // function that in theory could mutate, we assume not bc createElement freezes
  return element;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
