// @validateRefAccessDuringRender
import {useCallback, useMemo, useRef} from 'react';

type IntersectionCallback = (isIntersecting: boolean) => void;

function useIntersectionObserver(options: Partial<IntersectionObserverInit>) {
  const callbacks = useRef(new Map<string, IntersectionCallback>());

  const onIntersect = useCallback(
    (entries: ReadonlyArray<IntersectionObserverEntry>) => {
      entries.forEach(entry =>
        callbacks.current.get(entry.target.id)?.(entry.isIntersecting),
      );
    },
    [],
  );

  return useMemo(
    () => new IntersectionObserver(onIntersect, options),
    [onIntersect, options],
  );
}
