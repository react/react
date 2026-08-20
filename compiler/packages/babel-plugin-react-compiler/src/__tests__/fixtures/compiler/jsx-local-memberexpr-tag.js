import * as SharedRuntime from 'shared-runtime';
function useFoo() {
  const MyLocal = SharedRuntime;
  return <MyLocal.Text value={4} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};
