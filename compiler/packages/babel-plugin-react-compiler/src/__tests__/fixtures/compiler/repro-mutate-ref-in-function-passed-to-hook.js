// @flow
component Example() {
  const fooRef = useRef();

  function updateStyles() {
    const foo = fooRef.current;
    // The access of `barRef` here before its declaration causes it be hoisted...
    if (barRef.current == null || foo == null) {
      return;
    }
    foo.style.height = '100px';
  }

  // ...which previously meant that we didn't infer a type...
  const barRef = useRef(null);

  const resizeRef = useResizeObserver(
    rect => {
      const {width} = rect;
      // ...which meant that we failed to ignore the mutation here...
      barRef.current = width;
    } // ...which caused this to fail with "can't freeze a mutable function"
  );

  useLayoutEffect(() => {
    const observer = new ResizeObserver(_ => {
      updateStyles();
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return <div ref={resizeRef} />;
}
