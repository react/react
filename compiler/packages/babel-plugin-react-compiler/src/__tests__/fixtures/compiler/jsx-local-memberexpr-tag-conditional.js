import * as SharedRuntime from 'shared-runtime';
function useFoo({cond}) {
  const MyLocal = SharedRuntime;
  if (cond) {
    return <MyLocal.Text value={4} />;
  } else {
    return null;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{cond: true}],
};
