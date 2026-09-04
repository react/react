
## Input

```javascript
import {useState} from 'react';

function Component({initial}) {
  const [values, setValues] = useState(initial);

  const handleChange = (itemId, diff) => {
    const clone = () => ({...values});
    const copyValues = {...clone()};
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

error.invalid-mutate-state-shallow-copy-helper-spread.ts:9:4
   7 |     const clone = () => ({...values});
   8 |     const copyValues = {...clone()};
>  9 |     copyValues[itemId].confirmedQuantity = diff;
     |     ^^^^^^^^^^^^^^^^^^ `values` cannot be modified
  10 |     setValues(copyValues);
  11 |   };
  12 |
```
          
      