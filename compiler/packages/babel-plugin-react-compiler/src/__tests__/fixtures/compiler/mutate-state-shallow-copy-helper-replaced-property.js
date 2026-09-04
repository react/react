import {useState} from 'react';

function Component({initial}) {
  const [values, setValues] = useState(initial);

  const handleChange = (itemId, diff) => {
    const clone = () => ({...values});
    const copyValues = clone();
    copyValues[itemId] = {...copyValues[itemId]};
    copyValues[itemId].confirmedQuantity = diff;
    setValues(copyValues);
  };

  return <button onClick={() => handleChange('a', 5)}>Change</button>;
}
