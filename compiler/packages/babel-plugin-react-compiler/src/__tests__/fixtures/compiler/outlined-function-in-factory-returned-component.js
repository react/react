// @compilationMode:"infer"
import {useEffect, useState} from 'react';

function createCounter(step) {
  const Counter = () => {
    const [count, setCount] = useState(0);
    useEffect(() => {
      setCount(prev => prev + step);
    }, []);
    return count;
  };
  return Counter;
}

export const FIXTURE_ENTRYPOINT = {
  fn: createCounter,
  params: [1],
};
