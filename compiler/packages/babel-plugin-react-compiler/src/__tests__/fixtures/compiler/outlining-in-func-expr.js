const Component2 = props => {
  return (
    <ul>
      {props.items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
};

export const FIXTURE_ENTRYPOINT = {
  fn: Component2,
  params: [
    {
      items: [
        {id: 2, name: 'foo'},
        {id: 3, name: 'bar'},
      ],
    },
  ],
};
