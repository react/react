
## Input

```javascript
import {useEffect} from 'react';

export function Foo() {
  useEffect(() => {
    try {
      // do something
    } catch ({status}) {
      // do something
    }
  }, []);
}

```


## Error

```
Found 1 error:

Invariant: (BuildHIR::lowerAssignment) Could not find binding for declaration.

error.bug-invariant-couldnt-find-binding-for-decl.ts:7:14
   5 |     try {
   6 |       // do something
>  7 |     } catch ({status}) {
     |               ^^^^^^ (BuildHIR::lowerAssignment) Could not find binding for declaration.
   8 |       // do something
   9 |     }
  10 |   }, []);
```
          
      