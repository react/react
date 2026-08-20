import {Stringify} from 'shared-runtime';
function useFoo() {
  const MyLocal = Stringify;
  const callback = () => {
    return <MyLocal value={4} />;
  };
  return callback();
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};
