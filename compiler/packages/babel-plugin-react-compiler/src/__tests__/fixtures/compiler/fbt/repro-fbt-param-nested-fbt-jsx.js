import fbt from 'fbt';
import {Stringify, identity} from 'shared-runtime';

/**
 * MemoizeFbtAndMacroOperands needs to account for nested fbt calls.
 * Expected fixture `fbt-param-call-arguments` to succeed but it failed with error:
 *   /fbt-param-call-arguments.ts: Line 19 Column 11: fbt: unsupported babel node: Identifier
 *   ---
 *   t3
 *   ---
 */
function Component({firstname, lastname}) {
  'use memo';
  return (
    <div>
      {fbt(
        [
          'Name: ',
          fbt.param('firstname', <Stringify key={0} name={firstname} />),
          ', ',
          fbt.param(
            'lastname',
            identity(
              fbt(
                '(inner)' +
                  fbt.param('lastname', <Stringify key={1} name={lastname} />),
                'Inner fbt value'
              )
            )
          ),
        ],
        'Name'
      )}
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{firstname: 'first', lastname: 'last'}],
  sequentialRenders: [{firstname: 'first', lastname: 'last'}],
};
