import {useRef} from 'react';

export function useSomething() {
  return {a: useRef(0)};
}
