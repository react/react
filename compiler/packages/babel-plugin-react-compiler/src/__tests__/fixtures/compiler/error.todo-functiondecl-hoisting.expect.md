
## Input

```javascript
import {Stringify} from 'shared-runtime';

/**
 * Fixture currently fails with
 * Found differences in evaluator results
 *   Non-forget (expected):
 *   (kind: ok) <div>{"result":{"value":2},"fn":{"kind":"Function","result":{"value":2}},"shouldInvokeFns":true}</div>
 *   Forget:
 *   (kind: exception) bar is not a function
 */
function Foo({value}) {
  const result = bar();
  function bar() {
    return {value};
  }
  return <Stringify result={result} fn={bar} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{value: 2}],
};

```


## Error

```
Found 1 error:

Todo: [PruneHoistedContexts] Rewrite hoisted function references

error.todo-functiondecl-hoisting.ts:12:17
  10 |  */
  11 | function Foo({value}) {
> 12 |   const result = bar();
     |                  ^^^ [PruneHoistedContexts] Rewrite hoisted function references
  13 |   function bar() {
  14 |     return {value};
  15 |   }
```
          
      