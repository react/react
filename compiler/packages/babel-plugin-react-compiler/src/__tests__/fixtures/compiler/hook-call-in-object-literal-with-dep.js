import {useRef} from 'react';

export function useSomething(initial) {
  return {ref: useRef(initial)};
}
