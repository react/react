// @outputMode:"ssr"
import {useState} from 'react';

function Component({items}) {
  // The callback given to `map` runs during render, but it only passes the handler to a JSX
  // attribute, so the handler is still removed and the state is inlined
  const [selected, setSelected] = useState(null);
  const onSelect = event => {
    setSelected(event.target.value);
  };
  return (
    <ul>
      {items.map(item => (
        <li key={item}>
          <button value={item} onClick={onSelect}>
            {item === selected ? `${item} (selected)` : item}
          </button>
        </li>
      ))}
    </ul>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{items: ['a', 'b']}],
};
