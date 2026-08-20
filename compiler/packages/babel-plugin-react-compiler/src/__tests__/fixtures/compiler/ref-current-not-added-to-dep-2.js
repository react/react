// @validateRefAccessDuringRender:false
function Foo({a}) {
  const ref = useRef();
  const x = {a, val: ref.current};

  return <VideoList videos={x} />;
}
