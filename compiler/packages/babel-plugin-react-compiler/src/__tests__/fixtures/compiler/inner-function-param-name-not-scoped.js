function Component({items}) {
  const mapped = items.map(item => {
    return {id: item.id, name: item.name};
  });
  return <List items={mapped} />;
}
