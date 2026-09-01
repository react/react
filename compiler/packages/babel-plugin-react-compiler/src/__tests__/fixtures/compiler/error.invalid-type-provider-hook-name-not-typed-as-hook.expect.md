
## Input

```javascript
import {useHookNotTypedAsHook} from 'ReactCompilerTest';

function Component() {
  return useHookNotTypedAsHook();
}

```


## Error

```
Found 1 error:

Error: Invalid type configuration for module

Expected type for object property 'useHookNotTypedAsHook' from module 'ReactCompilerTest' to be a hook based on the property name.

error.invalid-type-provider-hook-name-not-typed-as-hook.ts:4:9
  2 |
  3 | function Component() {
> 4 |   return useHookNotTypedAsHook();
    |          ^^^^^^^^^^^^^^^^^^^^^ Invalid type configuration for module
  5 | }
  6 |
```
          
      