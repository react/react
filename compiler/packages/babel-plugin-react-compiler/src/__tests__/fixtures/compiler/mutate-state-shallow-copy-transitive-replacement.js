import {useState} from 'react';

function Component({initial}) {
  const [values, setValues] = useState(initial);

  const handleChange = (itemId, diff) => {
    const copyValues = {...values};
    const replace = object => {
      object[itemId] = {};
    };
    replace(copyValues);
    copyValues[itemId].confirmedQuantity = diff;
    setValues(copyValues);
  };

  return <button onClick={() => handleChange('a', 5)}>Change</button>;
}
