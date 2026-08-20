function component(a, b) {
  let x = useMemo(async () => {
    await a;
  }, []);
  return x;
}
