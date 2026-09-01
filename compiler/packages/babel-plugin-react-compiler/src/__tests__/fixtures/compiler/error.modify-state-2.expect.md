
## Input

```javascript
import {useState} from 'react';

function Foo() {
  const [state, setState] = useState({foo: {bar: 3}});
  const foo = state.foo;
  foo.bar = 1;
  return state;
}

```


## Error

```
Found 1 error:

Error: This value cannot be modified

Modifying a value returned from 'useState()', which should not be modified directly. Use the setter function to update instead.

error.modify-state-2.ts:6:2
  4 |   const [state, setState] = useState({foo: {bar: 3}});
  5 |   const foo = state.foo;
> 6 |   foo.bar = 1;
    |   ^^^ value cannot be modified
  7 |   return state;
  8 | }
  9 |
```
          
      