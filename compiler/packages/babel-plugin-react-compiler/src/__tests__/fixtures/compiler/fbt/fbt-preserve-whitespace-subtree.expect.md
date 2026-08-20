
## Input

```javascript
import fbt from 'fbt';

/**
 * Note that fbt whitespace rules apply to the entire fbt subtree,
 * not just direct children of fbt elements.
 * (e.g. here, the JSXText children of the span element also use
 * fbt whitespace rules)
 */

function Foo(props) {
  return (
    <fbt desc={'Dialog to show to user'}>
      <span key={props.name}>
        <fbt:param name="user name really long description for prettier">
          {props.name}
        </fbt:param>
        !
      </span>
    </fbt>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{name: 'Jason'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import fbt from "fbt";

/**
 * Note that fbt whitespace rules apply to the entire fbt subtree,
 * not just direct children of fbt elements.
 * (e.g. here, the JSXText children of the span element also use
 * fbt whitespace rules)
 */

function Foo(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.name) {
    t0 = fbt._(
      "{=m0}",
      [
        fbt._implicitParam(
          "=m0",
          <span key={props.name}>
            {fbt._(
              "{user name really long description for prettier} !",
              [
                fbt._param(
                  "user name really long description for prettier",

                  props.name,
                ),
              ],
              { hk: "rdgIJ" },
            )}
          </span>,
        ),
      ],
      { hk: "32Ufy5" },
    );
    $[0] = props.name;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{ name: "Jason" }],
};

```
      
### Eval output
(kind: ok) <span>Jason !</span>