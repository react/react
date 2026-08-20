
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees @enableOptionalDependencies
import {ValidateMemoization} from 'shared-runtime';
function Component(props) {
  const data = useMemo(() => {
    const x = [];
    x.push(props?.items);
    if (props.cond) {
      x.push(props.items);
    }
    return x;
  }, [props?.items, props.cond]);
  return (
    <ValidateMemoization inputs={[props?.items, props.cond]} output={data} />
  );
}

```


## Error

```
Found 1 error:

Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. The inferred dependencies did not match the manually specified dependencies, which could cause the value to change more or less frequently than expected. The inferred dependency was `props.items`, but the source dependencies were [props?.items, props.cond]. Inferred different dependency than source.

error.hoist-optional-member-expression-with-conditional.ts:4:23
   2 | import {ValidateMemoization} from 'shared-runtime';
   3 | function Component(props) {
>  4 |   const data = useMemo(() => {
     |                        ^^^^^^^
>  5 |     const x = [];
     | ^^^^^^^^^^^^^^^^^
>  6 |     x.push(props?.items);
     | ^^^^^^^^^^^^^^^^^
>  7 |     if (props.cond) {
     | ^^^^^^^^^^^^^^^^^
>  8 |       x.push(props.items);
     | ^^^^^^^^^^^^^^^^^
>  9 |     }
     | ^^^^^^^^^^^^^^^^^
> 10 |     return x;
     | ^^^^^^^^^^^^^^^^^
> 11 |   }, [props?.items, props.cond]);
     | ^^^^ Could not preserve existing manual memoization
  12 |   return (
  13 |     <ValidateMemoization inputs={[props?.items, props.cond]} output={data} />
  14 |   );
```
          
      