// @validateRefAccessDuringRender false
function VideoTab() {
  const ref = useRef();
  const t = ref.current;
  let x = () => {
    console.log(t);
  };

  return <VideoList videos={x} />;
}
