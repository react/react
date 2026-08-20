function VideoTab() {
  const ref = useRef();
  let x = () => {
    ref.current?.x;
  };

  return <VideoList videos={x} />;
}
