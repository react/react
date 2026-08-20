// @validateRefAccessDuringRender
function Component(props) {
  const ref = useRef(null);
  const value = ref.current;
  return value;
}
