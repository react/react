// @validateRefAccessDuringRender
function Component(props) {
  const ref = useRef({inner: null});
  ref.current.inner = props.value;
  return ref.current.inner;
}
