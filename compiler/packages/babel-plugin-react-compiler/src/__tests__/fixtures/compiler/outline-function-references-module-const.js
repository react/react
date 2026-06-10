// @compilationMode:"infer"
import {useIdentity} from 'shared-runtime';
import {Stringify} from 'shared-runtime';

const store = {value: 'hello'};

function createSomething() {
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
