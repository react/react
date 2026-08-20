
## Input

```javascript
// @enableNewMutationAliasingModel
import {Stringify, useIdentity} from 'shared-runtime';

function Component({prop1, prop2}) {
  'use memo';

  const data = useIdentity(
    new Map([
      [0, 'value0'],
      [1, 'value1'],
    ])
  );
  let i = 0;
  const items = [];
  items.push(
    <Stringify
      key={i}
      onClick={() => data.get(i) + prop1}
      shouldInvokeFns={true}
    />
  );
  i = i + 1;
  items.push(
    <Stringify
      key={i}
      onClick={() => data.get(i) + prop2}
      shouldInvokeFns={true}
    />
  );
  return <>{items}</>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{prop1: 'prop1', prop2: 'prop2'}],
  sequentialRenders: [
    {prop1: 'prop1', prop2: 'prop2'},
    {prop1: 'prop1', prop2: 'prop2'},
    {prop1: 'changed', prop2: 'prop2'},
  ],
};

```


## Error

```
Found 1 error:

Error: This value cannot be modified

Modifying a value used previously in JSX is not allowed. Consider moving the modification before the JSX.

error.invalid-jsx-captures-context-variable.ts:22:2
  20 |     />
  21 |   );
> 22 |   i = i + 1;
     |   ^ `i` cannot be modified
  23 |   items.push(
  24 |     <Stringify
  25 |       key={i}
```
          
      