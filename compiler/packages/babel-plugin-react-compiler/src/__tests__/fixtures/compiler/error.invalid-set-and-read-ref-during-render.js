// @validateRefAccessDuringRender
function Component(props) {
  const ref = useRef(null);
  ref.current = props.value;
  return ref.current;
}
