
## Input

```javascript
import {notAhookTypedAsHook} from 'ReactCompilerTest';

function Component() {
  return <div>{notAhookTypedAsHook()}</div>;
}

```


## Error

```
Found 1 error:

Error: Invalid type configuration for module

Expected type for object property 'useHookNotTypedAsHook' from module 'ReactCompilerTest' to be a hook based on the property name.

error.invalid-type-provider-nonhook-name-typed-as-hook.ts:4:15
  2 |
  3 | function Component() {
> 4 |   return <div>{notAhookTypedAsHook()}</div>;
    |                ^^^^^^^^^^^^^^^^^^^ Invalid type configuration for module
  5 | }
  6 |
```
          
      