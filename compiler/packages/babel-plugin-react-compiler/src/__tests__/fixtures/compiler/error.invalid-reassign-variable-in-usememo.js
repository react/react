function Component() {
  let x;
  const y = useMemo(() => {
    let z;
    x = [];
    z = true;
    return z;
  }, []);
  return [x, y];
}
