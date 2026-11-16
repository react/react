// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import {useEffect, useState} from 'react';

export function useThing({paused}) {
  const [count, setCount] = useState(0);
  // 🎉🎉 surrogate pairs: len_utf16() == 2 but len_utf8() == 4 per character
  useEffect(() => {
    setCount(1);
  }, [paused]);
  return count;
}
