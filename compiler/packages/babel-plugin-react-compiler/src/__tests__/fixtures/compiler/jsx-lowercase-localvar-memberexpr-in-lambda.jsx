import * as SharedRuntime from 'shared-runtime';
import {invoke} from 'shared-runtime';
function useComponentFactory({name}) {
  const localVar = SharedRuntime;
  const cb = () => <localVar.Stringify>hello world {name}</localVar.Stringify>;
  return invoke(cb);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useComponentFactory,
  params: [{name: 'sathya'}],
};
