
## Input

```javascript
import foo from 'useDefaultExportNotTypedAsHook';

function Component() {
  return <div>{foo()}</div>;
}

```


## Error

```
Found 1 error:

Error: Invalid type configuration for module

Expected type for `import ... from 'useDefaultExportNotTypedAsHook'` to be a hook based on the module name.

error.invalid-type-provider-hooklike-module-default-not-hook.ts:4:15
  2 |
  3 | function Component() {
> 4 |   return <div>{foo()}</div>;
    |                ^^^ Invalid type configuration for module
  5 | }
  6 |
```
          
      