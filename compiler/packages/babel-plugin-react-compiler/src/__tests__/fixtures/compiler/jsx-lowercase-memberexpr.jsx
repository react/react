import * as SharedRuntime from 'shared-runtime';
function Component({name}) {
  return <SharedRuntime.Stringify>hello world {name}</SharedRuntime.Stringify>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{name: 'sathya'}],
};
