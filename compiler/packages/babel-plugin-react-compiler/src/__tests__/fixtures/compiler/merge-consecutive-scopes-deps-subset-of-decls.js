import {useState} from 'react';

function Component() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
      {/**
       * The scope for the <button> depends on just the scope for the callback,
       * but the previous scope (after merging) will declare both the above
       * <button> and the callback.
       */}
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
