// @enablePreserveExistingMemoizationGuarantees:false
import {Stringify, identity} from 'shared-runtime';

function foo() {
  try {
    identity(`${Symbol('0')}`); // Uncaught TypeError: Cannot convert a Symbol value to a string (leave as is)
  } catch {}

  return (
    <Stringify
      value={[
        `` === '',
        `\n` === '\n',
        `a\nb`,
        `\n`,
        `a${1}b`,
        ` abc \u0041\n\u000a\ŧ`,
        `abc${1}def`,
        `abc${1}def${2}`,
        `abc${1}def${2}ghi`,
        `a${1 + 3}b${``}c${'d' + `e${2 + 4}f`}`,
        `1${2}${Math.sin(0)}`,
        `${NaN}`,
        `${Infinity}`,
        `${-Infinity}`,
        `${Number.MAX_SAFE_INTEGER}`,
        `${Number.MIN_SAFE_INTEGER}`,
        `${Number.MAX_VALUE}`,
        `${Number.MIN_VALUE}`,
        `${-0}`,
        `
        `,
        `${{}}`,
        `${[1, 2, 3]}`,
        `${true}`,
        `${false}`,
        `${null}`,
        `${undefined}`,
        `123456789${0}`,
        `${0}123456789`,
        `${0}123456789${0}`,
        `${0}1234${5}6789${0}`,
        `${0}1234${`${0}123456789${`${0}123456789${0}`}`}6789${0}`,
        `${0}1234${`${0}123456789${`${identity(0)}`}`}6789${0}`,
        `${`${`${`${0}`}`}`}`,
        `${`${`${`${''}`}`}`}`,
        `${`${`${`${identity('')}`}`}`}`,
      ]}
    />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};
