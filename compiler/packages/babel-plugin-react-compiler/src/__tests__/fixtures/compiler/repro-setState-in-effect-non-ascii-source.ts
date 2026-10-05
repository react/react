// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import {useEffect, useState} from 'react';

export function useThing({paused}) {
  const [isOnline, setIsOnline] = useState(true);
  // 非ASCII文字を含むコメント。これ以降はUTF-16のオフセットとUTF-8のバイト位置がずれる
  useEffect(() => {
    setIsOnline(true);
  }, [paused]);
  return isOnline;
}
