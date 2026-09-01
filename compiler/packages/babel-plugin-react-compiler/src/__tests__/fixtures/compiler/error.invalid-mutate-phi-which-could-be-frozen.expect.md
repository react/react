
## Input

```javascript
import {useHook} from 'shared-runtime';

function Component(props) {
  const frozen = useHook();
  let x;
  if (props.cond) {
    x = frozen;
  } else {
    x = {};
  }
  x.property = true;
}

```


## Error

```
Found 1 error:

Error: This value cannot be modified

Modifying a value returned from a hook is not allowed. Consider moving the modification into the hook where the value is constructed.

error.invalid-mutate-phi-which-could-be-frozen.ts:11:2
   9 |     x = {};
  10 |   }
> 11 |   x.property = true;
     |   ^ value cannot be modified
  12 | }
  13 |
```
          
      