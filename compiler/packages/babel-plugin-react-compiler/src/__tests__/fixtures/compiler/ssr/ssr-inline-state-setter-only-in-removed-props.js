// @outputMode:"ssr"
import {useState} from 'react';

function Component() {
  // The setters are only read by a ref and an event handler of builtin
  // elements, which are removed, so the state is still inlined
  const [node, setNode] = useState(null);
  const [count, setCount] = useState(0);
  return (
    <div ref={setNode} data-measured={node !== null}>
      <button onClick={() => queueMicrotask(() => setCount(count + 1))}>
        {count}
      </button>
    </div>
  );
}
