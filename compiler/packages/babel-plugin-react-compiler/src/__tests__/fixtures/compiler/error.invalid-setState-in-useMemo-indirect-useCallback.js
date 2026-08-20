import {useCallback} from 'react';

function useKeyedState({key, init}) {
  const [prevKey, setPrevKey] = useState(key);
  const [state, setState] = useState(init);

  const fn = useCallback(() => {
    setPrevKey(key);
    setState(init);
  });

  useMemo(() => {
    fn();
  }, [key, init]);

  return state;
}
