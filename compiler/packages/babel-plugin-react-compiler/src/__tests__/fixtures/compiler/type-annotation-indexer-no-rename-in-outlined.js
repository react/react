// @flow
function Component({items}) {
  const onClick = () => {
    const result = items.reduce(
      (acc, item) => {
        acc[item.order] = item;
        return acc;
      },
      ({}: {[displayOrder: number]: {order: number, name: string}})
    );
    submit(result);
  };
  return <Button onClick={onClick} />;
}
