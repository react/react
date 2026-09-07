// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import {useCallback, useEffect, useState} from 'react';

export function useOnlineStatus({paused = false}) {
  const [isOnline, setIsOnline] = useState(true);

  // 非ASCII文字を含むコメントなので、これ以降はUTF-16のオフセットとUTF-8のバイト位置がずれる
  useEffect(() => {
    if (paused) return;
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('offline', handleOffline);
    return () => window.removeEventListener('offline', handleOffline);
  }, [paused]);

  // このsetStateはSSAで名前を失うため、ソースコードから名前を復元する経路に入る
  const reset = useCallback(() => {
    if (paused) return;
    setIsOnline(true);
  }, [paused]);

  return {isOnline, reset};
}
