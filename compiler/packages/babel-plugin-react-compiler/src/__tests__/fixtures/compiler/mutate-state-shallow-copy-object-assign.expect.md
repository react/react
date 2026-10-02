
## Input

```javascript
import {useState} from 'react';

function Component({initial}) {
  const [values, setValues] = useState(initial);

  const handleChange = (itemId, diff) => {
    const copyValues = {...values};
    Object.assign(copyValues, {a: {confirmedQuantity: 0}});
    copyValues.a.confirmedQuantity = diff;
    setValues(copyValues);
  };

  return <button onClick={() => handleChange('a', 5)}>Change</button>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useState } from "react";

function Component(t0) {
  const $ = _c(2);
  const { initial } = t0;
  const [values, setValues] = useState(initial);
  let t1;
  if ($[0] !== values) {
    const handleChange = (itemId, diff) => {
      const copyValues = { ...values };
      Object.assign(copyValues, { a: { confirmedQuantity: 0 } });
      copyValues.a.confirmedQuantity = diff;
      setValues(copyValues);
    };
    t1 = <button onClick={() => handleChange("a", 5)}>Change</button>;
    $[0] = values;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

```
      
### Eval output
(kind: exception) Fixture not implemented