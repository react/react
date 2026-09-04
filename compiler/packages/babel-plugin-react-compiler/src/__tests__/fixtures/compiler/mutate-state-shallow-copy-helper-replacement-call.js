import {useState} from 'react';

function Component({initial}) {
  const [values, setValues] = useState(initial);

  const handleChange = (itemId, diff) => {
    const clone = () => {
      const copy = {...values};
      const replace = target => {
        target.a = {confirmedQuantity: 0};
      };
      replace(copy);
      return copy;
    };
    const copyValues = clone();
    copyValues.a.confirmedQuantity = diff;
    setValues(copyValues);
  };

  return <button onClick={() => handleChange('a', 5)}>Change</button>;
}
