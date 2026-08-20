
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees @enablePreserveExistingMemoizationGuarantees:false
import {makeObject_Primitives, Stringify} from 'shared-runtime';

function Component(props) {
  const object = {object: props.object};
  const entries = useMemo(() => Object.entries(object), [object]);
  entries.map(([, value]) => {
    value.updated = true;
  });
  return <Stringify entries={entries} />;
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

error.validate-object-entries-mutation.ts:6:57
  4 | function Component(props) {
  5 |   const object = {object: props.object};
> 6 |   const entries = useMemo(() => Object.entries(object), [object]);
    |                                                          ^^^^^^ This dependency may be modified later
  7 |   entries.map(([, value]) => {
  8 |     value.updated = true;
  9 |   });

Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. This value was memoized in source but not in compilation output.

error.validate-object-entries-mutation.ts:6:18
  4 | function Component(props) {
  5 |   const object = {object: props.object};
> 6 |   const entries = useMemo(() => Object.entries(object), [object]);
    |                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Could not preserve existing memoization
  7 |   entries.map(([, value]) => {
  8 |     value.updated = true;
  9 |   });
```
          
      