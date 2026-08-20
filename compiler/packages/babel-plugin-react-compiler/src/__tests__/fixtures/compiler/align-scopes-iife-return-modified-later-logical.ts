import {getNull} from 'shared-runtime';

function Component(props) {
  const items = (() => {
    return getNull() ?? [];
  })();
  items.push(props.a);
  return items;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: {}}],
};
