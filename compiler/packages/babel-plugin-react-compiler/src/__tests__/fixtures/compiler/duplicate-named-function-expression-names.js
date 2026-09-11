export function Component({value}) {
  const columns = [
    {
      render: function Render(input) {
        const copy = input;
        return copy + value;
      },
    },
    {
      render: function Render(input) {
        const copy = input;
        return copy + value;
      },
    },
  ];
  return <div>{columns}</div>;
}
