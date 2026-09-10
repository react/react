// @validateRefAccessDuringRender
function Component({ctx}) {
  return (
    <div>
      <input ref={ctx.foo} />
      {ctx.files.length > 0 ? <p>{ctx.files.length}</p> : null}
    </div>
  );
}
