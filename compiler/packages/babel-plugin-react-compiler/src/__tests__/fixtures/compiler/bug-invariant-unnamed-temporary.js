const displayValue = 'text';

function Bar({renderer}) {
  return renderer();
}

export function Foo() {
  return (
    <Bar
      renderer={(...props) => {
        return <span {...props}>{displayValue}</span>;
      }}
    />
  );
}
