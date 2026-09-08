// @flow @compilationMode(infer)
function Component(props: {items: Array<{isRead: boolean, id: string}>}) {
  const results = props.items.map(item => {
    const {isRead, id} = item;
    return ({
      isRead,
      id,
      label: isRead ? 'read' : 'unread',
    }: {
      isRead: boolean,
      id: string,
      label: string,
    });
  });
  return <div>{results.length}</div>;
}
