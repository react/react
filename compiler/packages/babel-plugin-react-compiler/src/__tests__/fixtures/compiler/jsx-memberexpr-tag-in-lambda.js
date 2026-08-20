import * as SharedRuntime from 'shared-runtime';
function useFoo() {
  const MyLocal = SharedRuntime;
  const callback = () => {
    return <MyLocal.Text value={4} />;
  };
  return callback();
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};
