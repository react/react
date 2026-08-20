import {CONST_STRING0, Text} from 'shared-runtime';
function useFoo() {
  'use no forget';
  return {tab: CONST_STRING0};
}

function Test() {
  const {tab} = useFoo();
  const currentTab = tab === CONST_STRING0 ? CONST_STRING0 : CONST_STRING0;

  return <Text value={currentTab} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Test,
  params: [],
  isComponent: true,
};
