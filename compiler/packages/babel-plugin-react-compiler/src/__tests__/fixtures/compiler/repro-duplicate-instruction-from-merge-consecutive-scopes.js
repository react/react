import {Stringify} from 'shared-runtime';

function Component({id}) {
  const bar = (() => {})();

  return (
    <>
      <Stringify title={bar} />
      <Stringify title={id ? true : false} />
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
