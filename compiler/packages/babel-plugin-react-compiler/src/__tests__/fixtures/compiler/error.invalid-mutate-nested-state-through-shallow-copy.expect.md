
## Input

```javascript
import {useState} from 'react';

function Component({initial}) {
  const [values, setValues] = useState(initial);

  const handleChange = (itemId, diff) => {
    const copyValues = {...values};
    copyValues[itemId].confirmedQuantity = diff;
    setValues(copyValues);
  };

  return <button onClick={() => handleChange('a', 5)}>Change</button>;
}

```


## Error

```
Found 1 error:

Error: This value cannot be modified

Modifying a value returned from 'useState()', which should not be modified directly. Use the setter function to update instead.

error.invalid-mutate-nested-state-through-shallow-copy.ts:8:4
   6 |   const handleChange = (itemId, diff) => {
   7 |     const copyValues = {...values};
>  8 |     copyValues[itemId].confirmedQuantity = diff;
     |     ^^^^^^^^^^^^^^^^^^ `values` cannot be modified
   9 |     setValues(copyValues);
  10 |   };
  11 |
```
          
      