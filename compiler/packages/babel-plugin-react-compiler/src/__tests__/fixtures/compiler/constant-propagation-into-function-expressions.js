import {Stringify, identity} from 'shared-runtime';

function Component(props) {
  const x = 42;
  const onEvent = () => {
    return identity(x);
  };
  return <Stringify onEvent={onEvent} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  sequentialRenders: [{}, {}],
};
