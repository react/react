// note: comments are for the ideal scopes, not what is currently
// emitted
function foo(props) {
  // scope 0: deps=[props.a] decl=[x] reassign=none
  let x = [];
  x.push(props.a);

  // scope 1: deps=[x] decl=[header] reassign=none
  const header = props.showHeader ? <div>{x}</div> : null;

  // scope 2:
  // deps=[x, props.b, props.c]
  // decl=none
  // reassign=[x]
  const y = [x]; // y depends on the earlier x
  x = []; // x reassigned
  y.push(props.b); // interleaved mutation of x/y
  x.push(props.c); // interleaved mutation

  // scope 3 ...
  const content = (
    <div>
      {x}
      {y}
    </div>
  );

  // scope 4 ...
  return (
    <>
      {header}
      {content}
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
