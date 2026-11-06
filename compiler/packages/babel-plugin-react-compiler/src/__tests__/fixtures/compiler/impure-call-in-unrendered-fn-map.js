// @validateNoImpureFunctionsInRender
import {useState} from 'react';

function List({items}) {
  const [last, setLast] = useState(0);
  function open(item) {
    setLast(Date.now() + item.length);
  }
  return (
    <div>
      {items.map(item => (
        <button key={item} type="button" onClick={() => open(item)}>
          {last}
        </button>
      ))}
    </div>
  );
}
