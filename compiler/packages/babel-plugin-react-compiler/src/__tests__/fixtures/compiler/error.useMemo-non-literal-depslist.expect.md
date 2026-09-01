
## Input

```javascript
import {useMemo} from 'react';

// react-hooks-deps would error on this code (complex expression in depslist),
// so Forget could bailout here
function App({text, hasDeps}) {
  const resolvedText = useMemo(
    () => {
      return text.toUpperCase();
    },
    hasDeps ? null : [text], // should be DCE'd
  );
  return resolvedText;
}

export const FIXTURE_ENTRYPOINT = {
  fn: App,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};

```


## Error

```
Found 1 error:

Error: Expected the dependency list for useMemo to be an array literal

Expected the dependency list for useMemo to be an array literal.

error.useMemo-non-literal-depslist.ts:10:4
   8 |       return text.toUpperCase();
   9 |     },
> 10 |     hasDeps ? null : [text], // should be DCE'd
     |     ^^^^^^^^^^^^^^^^^^^^^^^ Expected the dependency list for useMemo to be an array literal
  11 |   );
  12 |   return resolvedText;
  13 | }
```
          
      