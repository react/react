function Component(props) {
  const {value} = props;
  const items = props.list.filter(value => value > 0);
  return (
    <div>
      {items.length}
      {value}
    </div>
  );
}
