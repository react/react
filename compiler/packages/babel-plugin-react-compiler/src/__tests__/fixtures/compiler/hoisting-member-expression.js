import {Stringify} from 'shared-runtime';

function hoisting() {
  function onClick(x) {
    return x + bar.baz;
  }
  const bar = {baz: 1};

  return <Stringify onClick={onClick} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: hoisting,
  params: [],
  isComponent: false,
};
