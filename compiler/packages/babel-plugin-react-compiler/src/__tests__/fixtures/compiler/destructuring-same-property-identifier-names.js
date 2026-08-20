import {identity} from 'shared-runtime';

function Component(props) {
  const {
    x: {destructured},
    sameName: renamed,
  } = props;
  const sameName = identity(destructured);

  return [sameName, renamed];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: {destructured: 0}, sameName: 2}],
};
