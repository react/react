import {CONST_STRING0, CONST_STRING1, Text} from 'shared-runtime';

function useFoo() {
  'use no forget';
  return {tab: CONST_STRING1};
}

function Test() {
  const {tab} = useFoo();
  const currentTab = tab === CONST_STRING0 ? CONST_STRING0 : CONST_STRING1;

  return <Text value={currentTab} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Test,
  params: [],
  isComponent: true,
};
