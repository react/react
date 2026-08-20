function component(a, b) {
  let x = React.useMemo(async () => {
    await a;
  }, []);
  return x;
}
