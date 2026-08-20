
## Input

```javascript
import ReactCompilerTest from 'ReactCompilerTest';

function Component() {
  return ReactCompilerTest.useHookNotTypedAsHook();
}

```


## Error

```
Found 1 error:

Error: Invalid type configuration for module

Expected type for object property 'useHookNotTypedAsHook' from module 'ReactCompilerTest' to be a hook based on the property name.

error.invalid-type-provider-hook-name-not-typed-as-hook-namespace.ts:4:9
  2 |
  3 | function Component() {
> 4 |   return ReactCompilerTest.useHookNotTypedAsHook();
    |          ^^^^^^^^^^^^^^^^^ Invalid type configuration for module
  5 | }
  6 |
```
          
      