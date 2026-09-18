// @validateRefAccessDuringRender
// Regression test for https://github.com/react/react/issues/37507
// Passing `obj.prop` to a JSX `ref` attribute must not mark every other
// `obj.*` read as a ref access during render.
function Component({ctx}) {
  return (
    <div ref={ctx.foo}>
      {ctx.files.length > 0 ? <p>{ctx.files.length}</p> : null}
    </div>
  );
}

function ComponentWithLocal({ctx}) {
  const r = ctx.inputRef;
  return (
    <div ref={r}>
      {ctx.files.length > 0 ? <p>{ctx.files.length}</p> : null}
    </div>
  );
}
