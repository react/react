import {Stringify} from 'shared-runtime';

function hoisting() {
  function onClick() {
    return bar['baz'];
  }
  function onClick2() {
    return bar[baz];
  }
  const baz = 'baz';
  const bar = {baz: 1};

  return (
    <Stringify onClick={onClick} onClick2={onClick2} shouldInvokeFns={true} />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: hoisting,
  params: [],
};
