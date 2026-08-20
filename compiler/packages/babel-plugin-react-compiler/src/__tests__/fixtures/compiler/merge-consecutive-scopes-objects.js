import {useState} from 'react';
import {Stringify} from 'shared-runtime';

// This is a translation of the original merge-consecutive-scopes which uses plain objects
// to describe the UI instead of JSX. The JSXText elements in that fixture happen to
// prevent scome scopes from merging, which concealed a bug with the merging logic.
// By avoiding JSX we eliminate extraneous instructions and more accurately test the merging.
function Component(props) {
  let [state, setState] = useState(0);
  return [
    {component: Stringify, props: {text: 'Counter'}},
    {component: 'span', props: {children: [state]}},
    {
      component: 'button',
      props: {
        'data-testid': 'button',
        onClick: () => setState(state + 1),
        children: ['increment'],
      },
    },
  ];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
