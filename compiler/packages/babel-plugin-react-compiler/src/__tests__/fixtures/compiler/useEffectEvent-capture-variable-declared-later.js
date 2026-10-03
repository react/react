// @compilationMode:"infer"
import {useEffect, useEffectEvent, useState} from 'react';

// Repro from https://github.com/facebook/react/issues/37209
// The effect event reads `length`, which is declared after the callback.
// The callback must not be memoized, so it always sees the latest value.
export default function App() {
  const [data, setData] = useState([]);

  const logLength = useEffectEvent(() => {
    console.log('length', length);
  });

  const length = data.length - 0;

  useEffect(() => {
    setTimeout(() => setData([1, 2]), 300);

    addEventListener('click', logLength);
    return () => removeEventListener('click', logLength);
  }, []);

  return <div>Click anywhere to log the length</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: App,
  params: [{}],
};
