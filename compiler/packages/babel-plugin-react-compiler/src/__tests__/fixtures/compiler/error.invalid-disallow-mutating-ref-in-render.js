// @validateRefAccessDuringRender
function Component() {
  const ref = useRef(null);
  ref.current = false;

  return <button ref={ref} />;
}
