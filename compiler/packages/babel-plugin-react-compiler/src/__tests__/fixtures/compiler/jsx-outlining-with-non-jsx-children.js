// @enableJsxOutlining
function Component({arr}) {
  const x = useX();
  return (
    <>
      {arr.map((i, id) => {
        return (
          <Bar key={id} x={x}>
            <Baz i={i}>Test</Baz>
            <Foo k={i} />
          </Bar>
        );
      })}
    </>
  );
}

function Bar({x, children}) {
  return (
    <>
      {x}
      {children}
    </>
  );
}

function Baz({i, children}) {
  return (
    <>
      {i}
      {children}
    </>
  );
}

function Foo({k}) {
  return k;
}

function useX() {
  return 'x';
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{arr: ['foo', 'bar']}],
};
