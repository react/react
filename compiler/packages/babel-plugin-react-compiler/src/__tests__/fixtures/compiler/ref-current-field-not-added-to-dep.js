// @validateRefAccessDuringRender false
function VideoTab() {
  const ref = useRef();
  let x = () => {
    console.log(ref.current.x);
  };

  return <VideoList videos={x} />;
}
