
## Input

```javascript
import {Stringify} from 'shared-runtime';
/**
 * Also see error.todo-functiondecl-hoisting.tsx which shows *invalid*
 * compilation cases.
 *
 * This bailout specifically is a false positive for since this function's only
 * reference-before-definition are within other functions which are not invoked.
 */
function Foo() {
  'use memo';

  function foo() {
    return bar();
  }
  function bar() {
    return 42;
  }

  return <Stringify fn1={foo} fn2={bar} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
};

```


## Error

```
Found 1 error:

Todo: [PruneHoistedContexts] Rewrite hoisted function references

error.todo-valid-functiondecl-hoisting.ts:13:11
  11 |
  12 |   function foo() {
> 13 |     return bar();
     |            ^^^ [PruneHoistedContexts] Rewrite hoisted function references
  14 |   }
  15 |   function bar() {
  16 |     return 42;
```
          
      