function useKeyedState({key, init}) {
  const [prevKey, setPrevKey] = useState(key);
  const [state, setState] = useState(init);

  useMemo(() => {
    setPrevKey(key);
    setState(init);
  }, [key, init]);

  return state;
}
