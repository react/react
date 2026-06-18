// @compilationMode:"infer"
import {useIdentity} from 'shared-runtime';
import {Stringify} from 'shared-runtime';

function createSomething() {
  const store = {value: 'hello'};
  const Cmp = () => {
    const getStore = useIdentity(() => store);
    return <Stringify result={getStore()} />;
  };
  return Cmp;
}

const Thing = createSomething();

function Component() {
  return <Thing />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
