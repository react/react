import {Stringify} from 'shared-runtime';

function Component({kind, ...props}) {
  switch (kind) {
    default:
      return <Stringify {...props} />;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{kind: 'foo', a: 1, b: true, c: 'sathya'}],
};
