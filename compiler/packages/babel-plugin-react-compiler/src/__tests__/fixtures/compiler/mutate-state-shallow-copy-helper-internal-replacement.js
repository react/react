import {useState} from 'react';

function Component({initial}) {
  const [values, setValues] = useState(initial);

  const handleChange = (itemId, diff) => {
    const clone = () => {
      const copy = {...values};
      copy[itemId] = {};
      return copy;
    };
    const copyValues = clone();
    copyValues[itemId].confirmedQuantity = diff;
    setValues(copyValues);
  };

  return <button onClick={() => handleChange('a', 5)}>Change</button>;
}
