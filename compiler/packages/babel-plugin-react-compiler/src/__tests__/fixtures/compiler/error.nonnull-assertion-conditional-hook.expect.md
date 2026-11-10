
## Input

```javascript
import * as React from 'react';

function Component({enabled}) {
  if (enabled) {
    React!.useState(0);
  }
  return <div />;
}

```


## Error

```
Found 1 error:

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.nonnull-assertion-conditional-hook.ts:5:4
  3 | function Component({enabled}) {
  4 |   if (enabled) {
> 5 |     React!.useState(0);
    |     ^^^^^^^^^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
  6 |   }
  7 |   return <div />;
  8 | }
```
          
      