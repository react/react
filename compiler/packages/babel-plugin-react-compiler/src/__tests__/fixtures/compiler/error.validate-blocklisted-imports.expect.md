
## Input

```javascript
// @validateBlocklistedImports:["DangerousImport"]
import {foo} from 'DangerousImport';
import {useIdentity} from 'shared-runtime';

function useHook() {
  useIdentity(foo);
  return;
}

```


## Error

```
Found 1 error:

Todo: Bailing out due to blocklisted import

Import from module DangerousImport.

error.validate-blocklisted-imports.ts:2:0
  1 | // @validateBlocklistedImports:["DangerousImport"]
> 2 | import {foo} from 'DangerousImport';
    | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Bailing out due to blocklisted import
  3 | import {useIdentity} from 'shared-runtime';
  4 |
  5 | function useHook() {
```
          
      