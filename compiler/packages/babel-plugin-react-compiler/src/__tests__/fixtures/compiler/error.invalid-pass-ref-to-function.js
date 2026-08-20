// @validateRefAccessDuringRender
function Component(props) {
  const ref = useRef(null);
  const x = foo(ref);
  return x.current;
}
