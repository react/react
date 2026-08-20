function Component(props) {
  return <View {...props} />;
}

const View = React.memo(({items}) => {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
});

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      items: [
        {id: 2, name: 'foo'},
        {id: 3, name: 'bar'},
      ],
    },
  ],
};
