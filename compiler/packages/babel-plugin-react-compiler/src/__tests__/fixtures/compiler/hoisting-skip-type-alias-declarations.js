// @flow
type Item = {id: string, name: string};

function Component({items}: {items: Array<Item>}) {
  const onClick = () => {
    const mapped: Array<Item> = items.map(item => ({
      id: item.id,
      name: item.name.toUpperCase(),
    }));
    submit(mapped);
  };
  return <Button onClick={onClick} />;
}
