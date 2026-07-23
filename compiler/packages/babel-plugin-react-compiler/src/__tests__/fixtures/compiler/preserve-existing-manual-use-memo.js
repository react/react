// @enablePreserveExistingManualUseMemo
import {useCallback, useMemo} from 'react';

function Component({items, onSelect}) {
  const sorted = useMemo(() => [...items].sort(), [items]);
  const handleSelect = useCallback(item => onSelect(item), [onSelect]);
  return (
    <ul>
      {sorted.map(item => (
        <li key={item} onClick={() => handleSelect(item)}>
          {item}
        </li>
      ))}
    </ul>
  );
}

export default Component;
