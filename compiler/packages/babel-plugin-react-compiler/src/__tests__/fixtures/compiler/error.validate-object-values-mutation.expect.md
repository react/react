
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees @enablePreserveExistingMemoizationGuarantees:false
import {makeObject_Primitives, Stringify} from 'shared-runtime';

function Component(props) {
  const object = {object: props.object};
  const values = useMemo(() => Object.values(object), [object]);
  values.map(value => {
    value.updated = true;
  });
  return <Stringify values={values} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{object: {key: makeObject_Primitives()}}],
};

```


## Error

```
Found 2 errors:

Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. This dependency may be mutated later, which could cause the value to change unexpectedly.

error.validate-object-values-mutation.ts:6:55
  4 | function Component(props) {
  5 |   const object = {object: props.object};
> 6 |   const values = useMemo(() => Object.values(object), [object]);
    |                                                        ^^^^^^ This dependency may be modified later
  7 |   values.map(value => {
  8 |     value.updated = true;
  9 |   });

Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. This value was memoized in source but not in compilation output.

error.validate-object-values-mutation.ts:6:17
  4 | function Component(props) {
  5 |   const object = {object: props.object};
> 6 |   const values = useMemo(() => Object.values(object), [object]);
    |                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Could not preserve existing memoization
  7 |   values.map(value => {
  8 |     value.updated = true;
  9 |   });
```
          
      