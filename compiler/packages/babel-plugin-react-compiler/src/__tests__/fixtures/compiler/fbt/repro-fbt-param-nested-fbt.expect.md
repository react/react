
## Input

```javascript
import fbt from 'fbt';
import {identity} from 'shared-runtime';

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
          fbt.param('firstname', identity(firstname)),
          ', ',
          fbt.param(
            'lastname',
            identity(
              fbt(
                '(inner)' + fbt.param('lastname', identity(lastname)),
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

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import fbt from "fbt";
import { identity } from "shared-runtime";

/**
 * MemoizeFbtAndMacroOperands needs to account for nested fbt calls.
 * Expected fixture `fbt-param-call-arguments` to succeed but it failed with error:
 *   /fbt-param-call-arguments.ts: Line 19 Column 11: fbt: unsupported babel node: Identifier
 *   ---
 *   t3
 *   ---
 */
function Component(t0) {
  "use memo";
  const $ = _c(5);
  const { firstname, lastname } = t0;
  let t1;
  if ($[0] !== firstname || $[1] !== lastname) {
    t1 = fbt._(
      "Name: {firstname}, {lastname}",
      [
        fbt._param(
          "firstname",

          identity(firstname),
        ),
        fbt._param(
          "lastname",

          identity(
            fbt._(
              "(inner){lastname}",
              [
                fbt._param(
                  "lastname",

                  identity(lastname),
                ),
              ],
              { hk: "1Kdxyo" },
            ),
          ),
        ),
      ],
      { hk: "3AiIf8" },
    );
    $[0] = firstname;
    $[1] = lastname;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  let t2;
  if ($[3] !== t1) {
    t2 = <div>{t1}</div>;
    $[3] = t1;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ firstname: "first", lastname: "last" }],
  sequentialRenders: [{ firstname: "first", lastname: "last" }],
};

```
      
### Eval output
(kind: ok) <div>Name: first, (inner)last</div>