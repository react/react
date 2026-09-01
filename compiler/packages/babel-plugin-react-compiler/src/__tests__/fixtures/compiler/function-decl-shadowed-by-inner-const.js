function Component(props) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (el) {
      init(el, props.data);
    }
    function init(el, data) {
      const init = makeInit(data);
      init.start();
    }
  });
  return <div ref={ref} />;
}
