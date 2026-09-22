import {Stringify} from 'shared-runtime';

function Component({k}) {
  const obj = {
    [`prefix-${k}`]() {
      return 42;
    },
  };
  return <Stringify keys={Object.keys(obj)} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{k: 'dynamic'}],
};
