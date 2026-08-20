function VideoTab() {
  const ref = useRef();
  let x = () => {
    console.log(ref.current);
  };

  return <VideoList videos={x} />;
}
