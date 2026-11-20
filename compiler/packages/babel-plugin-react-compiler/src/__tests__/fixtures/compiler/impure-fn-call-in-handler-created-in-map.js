// @validateNoImpureFunctionsInRender
import {useState} from 'react';

function Component({items}) {
  const [last, setLast] = useState(0);
  function open(item) {
    setLast(Date.now() + item.length);
  }
  return (
    <div>
      {items.map(item => (
        <button key={item} onClick={() => open(item)}>
          {last}
        </button>
      ))}
    </div>
  );
}
