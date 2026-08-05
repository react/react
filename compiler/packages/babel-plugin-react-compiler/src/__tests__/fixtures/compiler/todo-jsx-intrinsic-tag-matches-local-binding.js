function Component({items}) {
  const colgroup = useMemo(
    () => (
      <colgroup>
        {items.map(item => (
          <col key={item.id} />
        ))}
      </colgroup>
    ),
    [items]
  );
  return (
    <table>
      {colgroup}
      <tbody />
    </table>
  );
}
