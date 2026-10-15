import {Stringify} from 'shared-runtime';

function foo() {
  return <Stringify value={['__SURROGATE_D83D__']} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};
