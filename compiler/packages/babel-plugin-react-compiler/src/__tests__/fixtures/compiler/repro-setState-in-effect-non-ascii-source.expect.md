
## Input

```javascript
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

```

## Code

```javascript
// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import { useCallback, useEffect, useState } from "react";

export function useOnlineStatus({ paused = false }) {
  const [isOnline, setIsOnline] = useState(true);

  // 非ASCII文字を含むコメントなので、これ以降はUTF-16のオフセットとUTF-8のバイト位置がずれる
  useEffect(() => {
    if (paused) return;
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("offline", handleOffline);
    return () => window.removeEventListener("offline", handleOffline);
  }, [paused]);

  // このsetStateはSSAで名前を失うため、ソースコードから名前を復元する経路に入る
  const reset = useCallback(() => {
    if (paused) return;
    setIsOnline(true);
  }, [paused]);

  return { isOnline, reset };
}

```

## Logs

```
{"kind":"CompileSuccess","fnLoc":{"start":{"line":4,"column":7,"index":131},"end":{"line":22,"column":1,"index":702},"filename":"repro-setState-in-effect-non-ascii-source.ts"},"fnName":"useOnlineStatus","memoSlots":8,"memoBlocks":3,"memoValues":4,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: exception) Fixture not implemented