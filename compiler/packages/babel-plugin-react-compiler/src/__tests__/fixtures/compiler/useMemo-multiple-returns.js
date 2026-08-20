// @validateNoVoidUseMemo
function Component({items}) {
  const value = useMemo(() => {
    for (let item of items) {
      if (item.match) return item;
    }
    return null;
  }, [items]);
  return <div>{value}</div>;
}
