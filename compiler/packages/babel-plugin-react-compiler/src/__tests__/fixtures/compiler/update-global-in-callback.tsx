import {Stringify} from 'shared-runtime';

let renderCount = 0;
function Foo() {
  const cb = () => {
    renderCount += 1;
    return renderCount;
  };
  return <Stringify cb={cb} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};
