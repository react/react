// @validateRefAccessDuringRender:false
function Foo({a}) {
  const ref = useRef();
  const val = ref.current;
  const x = {a, val};

  return <VideoList videos={x} />;
}
