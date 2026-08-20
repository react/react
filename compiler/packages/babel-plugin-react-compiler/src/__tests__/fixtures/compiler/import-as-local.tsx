import {
  useEffect,
  useRef,
  // @ts-expect-error
  experimental_useEffectEvent as useEffectEvent,
} from 'react';

let id = 0;
function uniqueId() {
  'use no memo';
  return id++;
}

export function useCustomHook(src: string): void {
  const uidRef = useRef(uniqueId());
  const destroyed = useRef(false);
  const getItem = (srcName, uid) => {
    return {srcName, uid};
  };

  const getItemEvent = useEffectEvent(() => {
    if (destroyed.current) return;

    getItem(src, uidRef.current);
  });

  useEffect(() => {
    destroyed.current = false;
    getItemEvent();
  }, []);
}

function Component() {
  useCustomHook('hello');
  return <div>Hello</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  isComponent: true,
  params: [{x: 1}],
};
