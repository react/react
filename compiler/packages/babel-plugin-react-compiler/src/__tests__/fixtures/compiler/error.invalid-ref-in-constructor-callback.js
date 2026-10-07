// @validateRefAccessDuringRender
import {useRef} from 'react';

function useCustomObserver(Observer) {
  const ref = useRef(null);
  return new Observer(() => ref.current);
}
