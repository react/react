import * as SharedRuntime from 'shared-runtime';
function Component({name}) {
  const localVar = SharedRuntime;
  return <localVar.Stringify>hello world {name}</localVar.Stringify>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{name: 'sathya'}],
};
