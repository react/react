function Component({item, cond}) {
  const [prevItem, setPrevItem] = useState(item);
  const [state, setState] = useState(0);

  useMemo(() => {
    if (cond) {
      setPrevItem(item);
      setState(0);
    }
  }, [cond, key, init]);

  return state;
}
