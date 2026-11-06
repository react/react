// @enableForest @enableEmitHookGuards
import {useState} from 'react';

function Component({initial}) {
  const [count, setCount] = useState(initial);
  return <div onClick={() => setCount(count + 1)}>{count}</div>;
}
