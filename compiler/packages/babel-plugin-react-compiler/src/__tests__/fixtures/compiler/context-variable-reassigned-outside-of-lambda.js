import {Stringify} from 'shared-runtime';

function Component(props) {
  let x = null;
  const callback = () => {
    console.log(x);
  };
  x = {};
  return <Stringify callback={callback} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
