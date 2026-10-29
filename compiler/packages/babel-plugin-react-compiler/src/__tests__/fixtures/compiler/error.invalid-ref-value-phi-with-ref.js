// @validateRefAccessDuringRender
function Component({cond}) {
  const ref = useRef(null);
  const x = cond ? ref : ref.current;
  return <Foo value={x} />;
}
