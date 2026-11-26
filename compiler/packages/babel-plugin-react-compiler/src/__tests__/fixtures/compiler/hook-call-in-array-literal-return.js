import {useRef} from 'react';

export function useTuple() {
  return [useRef(null)];
}
