
## Input

```javascript
import fbt from 'fbt';
import {identity} from 'shared-runtime';

/**
 * Note that the fbt transform looks for callsites with a `fbt`-named callee.
 * This is incompatible with react-compiler as we rename local variables in
 * HIRBuilder + RenameVariables.
 *
 * See evaluator error:
 *   Found differences in evaluator results
 *   Non-forget (expected):
 *   (kind: ok) <div>Hello, Sathya!Goodbye, Sathya!</div>
 *   Forget:
 *   (kind: exception) fbt$0.param is not a function
 */

function Foo(props) {
  const getText1 = fbt =>
    fbt(
      `Hello, ${fbt.param('(key) name', identity(props.name))}!`,
      '(description) Greeting'
    );

  const getText2 = fbt =>
    fbt(
      `Goodbye, ${fbt.param('(key) name', identity(props.name))}!`,
      '(description) Greeting2'
    );

  return (
    <div>
      {getText1(fbt)}
      {getText2(fbt)}
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{name: 'Sathya'}],
};

```


## Error

```
Found 4 errors:

Todo: Support local variables named `fbt`

Local variables named `fbt` may conflict with the fbt plugin and are not yet supported.

error.todo-fbt-as-local.ts:18:19
  16 |
  17 | function Foo(props) {
> 18 |   const getText1 = fbt =>
     |                    ^^^ Support local variables named `fbt`
  19 |     fbt(
  20 |       `Hello, ${fbt.param('(key) name', identity(props.name))}!`,
  21 |       '(description) Greeting'

Todo: Support local variables named `fbt`

Local variables named `fbt` may conflict with the fbt plugin and are not yet supported.

error.todo-fbt-as-local.ts:18:19
  16 |
  17 | function Foo(props) {
> 18 |   const getText1 = fbt =>
     |                    ^^^ Support local variables named `fbt`
  19 |     fbt(
  20 |       `Hello, ${fbt.param('(key) name', identity(props.name))}!`,
  21 |       '(description) Greeting'

Todo: Support local variables named `fbt`

Local variables named `fbt` may conflict with the fbt plugin and are not yet supported.

error.todo-fbt-as-local.ts:18:19
  16 |
  17 | function Foo(props) {
> 18 |   const getText1 = fbt =>
     |                    ^^^ Support local variables named `fbt`
  19 |     fbt(
  20 |       `Hello, ${fbt.param('(key) name', identity(props.name))}!`,
  21 |       '(description) Greeting'

Todo: Support local variables named `fbt`

Local variables named `fbt` may conflict with the fbt plugin and are not yet supported.

error.todo-fbt-as-local.ts:24:19
  22 |     );
  23 |
> 24 |   const getText2 = fbt =>
     |                    ^^^ Support local variables named `fbt`
  25 |     fbt(
  26 |       `Goodbye, ${fbt.param('(key) name', identity(props.name))}!`,
  27 |       '(description) Greeting2'
```
          
      