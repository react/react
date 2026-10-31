import {Stringify} from 'shared-runtime';

function Component({x}) {
  const unused = () => submit();
  function submit() {
    return x;
  }
  return <Stringify onClick={submit} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: 42}],
};
