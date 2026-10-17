// @validateRefAccessDuringRender
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

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      ctx: {
        foo: value => console.log(value?.tagName),
        files: ['file'],
      },
    },
  ],
};
