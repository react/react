// @compilationMode:"infer"
import {useEffect, useState} from 'react';

function createCounter(step) {
  return function Counter() {
    'use memo';
    const [count, setCount] = useState(0);
    useEffect(() => {
      setCount(prev => prev + step);
    }, []);
    return count;
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: createCounter,
  params: [1],
};
