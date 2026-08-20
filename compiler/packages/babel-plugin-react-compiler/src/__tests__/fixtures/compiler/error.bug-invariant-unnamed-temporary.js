import Bar from './Bar';

export function Foo() {
  return (
    <Bar
      renderer={(...props) => {
        return <span {...props}>{displayValue}</span>;
      }}
    />
  );
}
