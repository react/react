function Component(props) {
  const useItems = props.items;
  const a = useItems.map(x => x);
  const b = props.useItems.map(x => x);
  const c = props.cond ? props.useItems.map(x => x) : null;
  return (
    <div>
      {a}
      {b}
      {c}
    </div>
  );
}
