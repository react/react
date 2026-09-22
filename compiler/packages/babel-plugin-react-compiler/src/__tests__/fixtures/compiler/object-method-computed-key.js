import {Stringify} from 'shared-runtime';

function Component({keyName}) {
  const obj = {
    [keyName]() {
      return 42;
    },
  };
  return <Stringify keys={Object.keys(obj)} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{keyName: 'dynamic'}],
};
