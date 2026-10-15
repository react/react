import {Stringify} from 'shared-runtime';

function Component(props) {
  const keyName = props.keyName;
  const obj = {
    [keyName]() {
      return 'dynamic';
    },
  };
  return <Stringify keys={Object.keys(obj)} value={obj[keyName]()} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{keyName: 'computedPropKey'}],
};
