import {Stringify} from 'shared-runtime';

function foo() {
  const data = {
    'x\u00B2': 1,
    '\u0345': 2,
    'e\u0301': 3,
    'a\u00B7b': 4,
  };
  // Not valid identifiers: the loads must stay computed
  const superscript = 'x\u00B2';
  const combiningStart = '\u0345';
  // Valid identifiers: the loads can become property loads
  const combiningMark = 'e\u0301';
  const middleDot = 'a\u00B7b';
  return (
    <Stringify
      value={[
        data[superscript],
        data[combiningStart],
        data[combiningMark],
        data[middleDot],
      ]}
    />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};
