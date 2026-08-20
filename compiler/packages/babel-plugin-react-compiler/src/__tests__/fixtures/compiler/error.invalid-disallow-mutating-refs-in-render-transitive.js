// @validateRefAccessDuringRender
function Component() {
  const ref = useRef(null);

  const setRef = () => {
    ref.current = false;
  };
  const changeRef = setRef;
  changeRef();

  return <button ref={ref} />;
}
